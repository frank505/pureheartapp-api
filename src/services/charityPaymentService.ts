import Stripe from 'stripe';
import CharityDonation from '../models/CharityDonation';
import CharityOrganization from '../models/CharityOrganization';
import User from '../models/User';
import Commitment from '../models/Commitment';
import { DonationStatus, PaymentMethod } from '../models/CharityDonation';
import { queueManager } from '../config/queue';

// Helper to get PushQueue from the queue manager
const PushQueue = {
  sendNotification: async (notification: any) => {
    const pushQueue = queueManager.getQueue('pushNotifications');
    if (pushQueue) {
      await pushQueue.add('sendNotification', notification);
    }
  }
};

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

export interface ICreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency: string;
  userId: number;
  commitmentId: number;
  charityId: number;
  metadata?: Record<string, string>;
}

export interface ICreatePaymentIntentResponse {
  success: boolean;
  message: string;
  data?: {
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  };
  error?: string;
}

export interface ITransferToCharityRequest {
  amount: number; // Amount in cents
  charityStripeAccountId: string;
  paymentIntentId: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface ITransferToCharityResponse {
  success: boolean;
  message: string;
  data?: {
    transferId: string;
    amount: number;
    charityAccountId: string;
  };
  error?: string;
}

class CharityPaymentService {
  /**
   * Create a payment intent for charity donation
   */
  async createPaymentIntent(request: ICreatePaymentIntentRequest): Promise<ICreatePaymentIntentResponse> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: request.userId.toString(),
          commitmentId: request.commitmentId.toString(),
          charityId: request.charityId.toString(),
          purpose: 'charity_donation',
          ...request.metadata,
        },
      });

      return {
        success: true,
        message: 'Payment intent created successfully',
        data: {
          clientSecret: paymentIntent.client_secret!,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        message: 'Failed to create payment intent',
        error: error.message,
      };
    }
  }

  /**
   * Transfer money to charity organization (after successful payment)
   */
  async transferToCharity(request: ITransferToCharityRequest): Promise<ITransferToCharityResponse> {
    try {
      // Calculate the amount to transfer (100% goes to charity - we take no fee)
      const transferAmount = request.amount;

      const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: 'usd',
        destination: request.charityStripeAccountId,
        description: request.description,
        metadata: {
          paymentIntentId: request.paymentIntentId,
          purpose: 'charity_donation_transfer',
          ...request.metadata,
        },
      });

      return {
        success: true,
        message: 'Transfer to charity completed successfully',
        data: {
          transferId: transfer.id,
          amount: transfer.amount,
          charityAccountId: transfer.destination as string,
        },
      };
    } catch (error: any) {
      console.error('Error transferring to charity:', error);
      return {
        success: false,
        message: 'Failed to transfer to charity',
        error: error.message,
      };
    }
  }

  /**
   * Confirm payment intent and process charity transfer
   */
  async confirmPaymentAndTransfer(paymentIntentId: string): Promise<{
    success: boolean;
    message: string;
    paymentIntent?: Stripe.PaymentIntent;
    transfer?: Stripe.Transfer;
    error?: string;
  }> {
    try {
      // Retrieve the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return {
          success: false,
          message: `Payment not succeeded. Status: ${paymentIntent.status}`,
        };
      }

      // Extract metadata to get charity info
      const { charityId, commitmentId, userId } = paymentIntent.metadata;

      if (!charityId) {
        return {
          success: false,
          message: 'Charity information not found in payment metadata',
        };
      }

      // Get charity Stripe account ID from database
      const charity = await CharityOrganization.findByPk(parseInt(charityId));
      
      if (!charity) {
        return {
          success: false,
          message: 'Charity organization not found',
        };
      }

      // If charity has Stripe account, process transfer
      if (charity.stripe_account_id) {
        const transferResult = await this.transferToCharity({
          amount: paymentIntent.amount,
          charityStripeAccountId: charity.stripe_account_id,
          paymentIntentId: paymentIntent.id,
          description: `Commitment failure donation for commitment ${commitmentId}`,
          metadata: {
            userId: userId || '',
            commitmentId: commitmentId || '',
            charityId: charityId || ''
          }
        });

        return {
          success: transferResult.success,
          message: transferResult.message,
          paymentIntent,
          transfer: transferResult.data ? {
            id: transferResult.data.transferId,
            amount: transferResult.data.amount,
            destination: transferResult.data.charityAccountId
          } as any : undefined,
        };
      }

      return {
        success: true,
        message: 'Payment confirmed successfully. Charity transfer pending Stripe account setup.',
        paymentIntent,
      };
    } catch (error: any) {
      console.error('Error confirming payment and transfer:', error);
      return {
        success: false,
        message: 'Failed to confirm payment and transfer',
        error: error.message,
      };
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object as Stripe.Transfer);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    
    try {
      const { userId, commitmentId, charityId } = paymentIntent.metadata;
      
      if (!userId || !commitmentId || !charityId) {
        console.error('Missing required metadata in payment intent');
        return;
      }
      
      // Create CharityDonation record
      const donation = await CharityDonation.create({
        userId: parseInt(userId),
        commitmentId: parseInt(commitmentId),
        charityId: parseInt(charityId),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: DonationStatus.COMPLETED,
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: PaymentMethod.STRIPE,
        paymentDate: new Date(),
        metadata: paymentIntent.metadata
      });

      // Get user and charity details for notification
      const [user, charity] = await Promise.all([
        User.findByPk(parseInt(userId), { attributes: ['id', 'firstName', 'lastName'] }),
        CharityOrganization.findByPk(parseInt(charityId), { attributes: ['id', 'name'] })
      ]);

      // Send notification to user about successful donation
      if (user) {
        await PushQueue.sendNotification({
          type: 'generic',
          actorId: parseInt(userId),
          targetUserId: parseInt(userId),
          title: 'Donation Successful',
          body: `Your $${(paymentIntent.amount / 100).toFixed(2)} donation to ${charity?.name || 'charity'} has been processed successfully.`,
          data: {
            donationId: donation.id.toString(),
            charityName: charity?.name || 'Unknown Charity',
            amount: (paymentIntent.amount / 100).toFixed(2),
            purpose: 'donation_success'
          }
        });
      }

      // Trigger transfer to charity if Stripe account is set up
      if (charity?.stripe_account_id) {
        await this.transferToCharity({
          amount: paymentIntent.amount,
          charityStripeAccountId: charity.stripe_account_id,
          paymentIntentId: paymentIntent.id,
          description: `Commitment failure donation - ${user?.firstName} ${user?.lastName}`,
          metadata: paymentIntent.metadata
        });
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment failed: ${paymentIntent.id}`);
    
    try {
      const { userId, commitmentId, charityId } = paymentIntent.metadata;
      
      if (!userId || !commitmentId || !charityId) {
        console.error('Missing required metadata in payment intent');
        return;
      }
      
      // Update or create CharityDonation record with failed status
      const [donation] = await CharityDonation.findOrCreate({
        where: { stripePaymentIntentId: paymentIntent.id },
        defaults: {
          userId: parseInt(userId),
          commitmentId: parseInt(commitmentId),
          charityId: parseInt(charityId),
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: DonationStatus.FAILED,
          stripePaymentIntentId: paymentIntent.id,
          paymentMethod: PaymentMethod.STRIPE,
          metadata: paymentIntent.metadata
        }
      });

      // Update status if record already exists
      if (donation.status !== DonationStatus.FAILED) {
        await donation.update({ status: DonationStatus.FAILED });
      }

      // Get user and charity details for notification
      const [user, charity] = await Promise.all([
        User.findByPk(parseInt(userId), { attributes: ['id', 'firstName', 'lastName'] }),
        CharityOrganization.findByPk(parseInt(charityId), { attributes: ['id', 'name'] })
      ]);

      // Send notification to user about failed donation
      if (user) {
        await PushQueue.sendNotification({
          type: 'generic',
          actorId: parseInt(userId),
          targetUserId: parseInt(userId),
          title: 'Donation Payment Failed',
          body: `Your $${(paymentIntent.amount / 100).toFixed(2)} donation to ${charity?.name || 'charity'} could not be processed. Please check your payment method.`,
          data: {
            donationId: donation.id.toString(),
            charityName: charity?.name || 'Unknown Charity',
            amount: (paymentIntent.amount / 100).toFixed(2),
            purpose: 'donation_failed',
            retryAvailable: 'true'
          }
        });
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  /**
   * Handle transfer created
   */
  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    console.log(`Transfer created: ${transfer.id}`);
    
    try {
      const paymentIntentId = transfer.metadata.paymentIntentId;
      
      if (!paymentIntentId) {
        console.error('No payment intent ID found in transfer metadata');
        return;
      }

      // Update CharityDonation with transfer information
      const donation = await CharityDonation.findOne({
        where: { stripePaymentIntentId: paymentIntentId }
      });

      if (donation) {
        await donation.update({
          stripeTransferId: transfer.id,
          transferDate: new Date()
        });

        // Get charity and user details
        const [charity, user] = await Promise.all([
          CharityOrganization.findByPk(donation.charityId, { attributes: ['id', 'name', 'email'] }),
          User.findByPk(donation.userId, { attributes: ['id', 'firstName', 'lastName'] })
        ]);

        // Log successful transfer for charity notification
        // Note: In a real implementation, you might send email notifications to charities
        console.log(
          `Transfer completed: $${(transfer.amount / 100).toFixed(2)} transferred to ${charity?.name || 'charity'} ` +
          `from user ${user?.firstName} ${user?.lastName} (Transfer ID: ${transfer.id})`
        );

        // Send confirmation to user that transfer completed
        if (user) {
          await PushQueue.sendNotification({
            type: 'generic',
            actorId: donation.userId,
            targetUserId: donation.userId,
            title: 'Donation Transfer Complete',
            body: `Your $${(transfer.amount / 100).toFixed(2)} donation has been successfully transferred to ${charity?.name || 'charity'}.`,
            data: {
              donationId: donation.id.toString(),
              transferId: transfer.id,
              charityName: charity?.name || 'Unknown Charity',
              amount: (transfer.amount / 100).toFixed(2),
              purpose: 'transfer_complete'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling transfer creation:', error);
    }
  }

  /**
   * Create a refund for a charity donation
   */
  async refundDonation(paymentIntentId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    refund?: Stripe.Refund;
    error?: string;
  }> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          reason: reason || 'User requested refund',
        },
      });

      return {
        success: true,
        message: 'Refund processed successfully',
        refund,
      };
    } catch (error: any) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        message: 'Failed to process refund',
        error: error.message,
      };
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentIntentId: string): Promise<{
    success: boolean;
    message: string;
    paymentIntent?: Stripe.PaymentIntent;
    error?: string;
  }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        message: 'Payment details retrieved successfully',
        paymentIntent,
      };
    } catch (error: any) {
      console.error('Error retrieving payment details:', error);
      return {
        success: false,
        message: 'Failed to retrieve payment details',
        error: error.message,
      };
    }
  }
}

export default new CharityPaymentService();