import CharityOrganization, {
  CharityCategory,
  CharityOrganizationCreationAttributes,
  GeographicScope
} from '../src/models/CharityOrganization';
import sequelize from '../src/config/database';

interface CharitySeed extends CharityOrganizationCreationAttributes {
  name: string;
  website: string;
  email: string;
  category: CharityCategory;
  tax_id: string;
}

const charities: CharitySeed[] = [
  {
    name: 'Fight the New Drug',
    legal_name: 'Fight the New Drug, Inc.',
    description: 'Grassroots nonprofit providing research-based education about the harms of pornography.',
    mission: 'Provide individuals and communities with science, facts, and personal accounts so they can make informed decisions about pornography.',
    category: CharityCategory.ANTI_PORNOGRAPHY,
    website: 'https://fightthenewdrug.org',
    email: 'info@fightthenewdrug.org',
    phone: '+1-385-404-8811',
    address: 'PO Box 522378, Salt Lake City, UT 84152, USA',
    mailing_address: 'PO Box 522378, Salt Lake City, UT 84152, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '26-3550143',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from public sources on fightthenewdrug.org. Pending Stripe Connect onboarding and document verification.',
    charity_navigator_url: 'https://www.charitynavigator.org/ein/263550143',
    founded_year: 2009,
    ecfa_member: false,
    bbb_accredited: false,
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Pornography education', 'Awareness campaigns', 'Youth outreach'],
    geographic_scope: GeographicScope.INTERNATIONAL,
    primary_services: ['Education resources', 'School presentations', 'Advocacy'],
    leadership_info: {
      executiveDirector: 'Clay Olsen (Co-Founder)',
      boardChairs: ['Board of Directors listed on website']
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/fightthenewdrug/',
      instagram: 'https://www.instagram.com/fightthenewdrug/',
      twitter: 'https://twitter.com/fightthenewdrug',
      youtube: 'https://www.youtube.com/fightthenewdrug'
    },
    metadata: {
      donationPage: 'https://fightthenewdrug.org/donate/',
      spokenLanguages: ['English']
    }
  },
  {
    name: 'National Center on Sexual Exploitation',
    legal_name: 'National Center on Sexual Exploitation',
    description: 'Nonpartisan nonprofit tackling the entire spectrum of sexual exploitation through advocacy, research, and litigation.',
    mission: 'Create a world free from sexual abuse and exploitation by addressing the links between pornography, prostitution, trafficking, and other forms of sexual harm.',
    category: CharityCategory.SEXUAL_EXPLOITATION,
    website: 'https://endsexualexploitation.org',
    email: 'public@ncose.com',
    phone: '+1-202-393-7245',
    address: '1201 F St NW, Suite 200, Washington, DC 20004, USA',
    mailing_address: '1201 F St NW, Suite 200, Washington, DC 20004, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '52-1282720',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from endsexualexploitation.org contact information. Verify legal documents and Connect account.',
    charity_navigator_url: 'https://www.charitynavigator.org/ein/521282720',
    guidestar_url: 'https://www.guidestar.org/profile/52-1282720',
    founded_year: 1962,
    ecfa_member: false,
    bbb_accredited: false,
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Corporate advocacy', 'Legislative reform', 'Research publications'],
    geographic_scope: GeographicScope.NATIONAL,
    primary_services: ['Policy advocacy', 'Legal support', 'Research and education'],
    leadership_info: {
      ceo: 'Dawn Hawkins',
      boardChairs: ['Board roster published online']
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/centeronexploitation',
      instagram: 'https://www.instagram.com/endexploitation/',
      twitter: 'https://twitter.com/ncose',
      youtube: 'https://www.youtube.com/channel/UCD45nGjBYtEcVXFqXk7LUjg'
    },
    metadata: {
      coalition: 'Leads the Coalition to End Sexual Exploitation',
      pressEmail: 'press@ncose.com'
    }
  },
  {
    name: 'Polaris Project',
    legal_name: 'Polaris',
    description: 'Operates the U.S. National Human Trafficking Hotline and drives systemic change to end trafficking.',
    mission: 'Disrupt and prevent human trafficking while supporting survivors on their path to freedom.',
    category: CharityCategory.HUMAN_TRAFFICKING,
    website: 'https://polarisproject.org',
    email: 'info@polarisproject.org',
    phone: '+1-202-790-6300',
    address: 'PO Box 65323, Washington, DC 20035, USA',
    mailing_address: 'PO Box 65323, Washington, DC 20035, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '03-0391561',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from polarisproject.org. Confirm hotline partnership details and Connect onboarding.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/030391561',
    guidestar_url: 'https://www.guidestar.org/profile/03-0391561',
    founded_year: 2002,
    ecfa_member: false,
    bbb_accredited: true,
    bbb_rating: 'A+',
    bbb_url: 'https://www.give.org/charity-reviews/all/polaris-in-washington-dc-17037',
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Hotline services', 'Data analysis', 'Policy reform'],
    geographic_scope: GeographicScope.NATIONAL,
    primary_services: ['24/7 hotline', 'Data-driven research', 'Training and technical assistance'],
    leadership_info: {
      ceo: 'Catherine Chen'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/polarisproject',
      instagram: 'https://www.instagram.com/polarisproject/',
      twitter: 'https://twitter.com/polaris_project',
      linkedin: 'https://www.linkedin.com/company/polaris-project'
    },
    metadata: {
      hotline: {
        phone: '1-888-373-7888',
        text: '233733 (Text "BeFree")',
        chat: 'https://humantraffickinghotline.org/chat'
      },
      referralDirectory: 'https://humantraffickinghotline.org/en/find-local-services'
    }
  },
  {
    name: 'International Justice Mission',
    legal_name: 'International Justice Mission',
    description: 'Global organization partnering with local authorities to protect people in poverty from violence.',
    mission: 'Rescue victims, bring criminals to justice, restore survivors, and strengthen justice systems to end slavery and trafficking.',
    category: CharityCategory.HUMAN_TRAFFICKING,
    website: 'https://www.ijm.org',
    email: 'contact@ijm.org',
    phone: '+1-844-422-5878',
    address: 'PO Box 90580, Washington, DC 20090, USA',
    mailing_address: 'PO Box 90580, Washington, DC 20090, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '54-1722887',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from ijm.org contact page. Verify donation team contact and Connect account via onboarding.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/541722887',
    guidestar_url: 'https://www.guidestar.org/profile/54-1722887',
    founded_year: 1997,
    ecfa_member: true,
    ecfa_url: 'https://www.ecfa.org/MemberProfile.aspx?ID=38680',
    bbb_accredited: true,
    bbb_rating: 'A+',
    bbb_url: 'https://www.give.org/charity-reviews/national/human-services/international-justice-mission-in-washington-dc-4319',
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Forced labor', 'Sex trafficking', 'Violence against women and children'],
    geographic_scope: GeographicScope.INTERNATIONAL,
    primary_services: ['Rescue operations', 'Legal advocacy', 'Aftercare support'],
    leadership_info: {
      ceo: 'Gary Haugen',
      president: 'Sean Litton'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/InternationalJusticeMission/',
      instagram: 'https://www.instagram.com/ijm/',
      twitter: 'https://twitter.com/IJM',
      youtube: 'https://www.youtube.com/IJM'
    },
    metadata: {
      complaintForm: 'https://forms.office.com/r/mtuhJ5aJqw',
      donorServices: 'https://www.ijm.org/contact-us'
    }
  },
  {
    name: 'Exodus Cry',
    legal_name: 'Exodus Cry',
    description: 'Abolitionist organization fighting sexual exploitation through culture-shifting media, legal advocacy, and survivor outreach.',
    mission: 'Abolish sex trafficking and commercial sexual exploitation while empowering survivors with hope and healing.',
    category: CharityCategory.SEXUAL_EXPLOITATION,
    website: 'https://exoduscry.com',
    email: 'info@exoduscry.com',
    phone: '+1-816-398-7490',
    address: '638 Camino De Los Mares, Suite H130-650, San Clemente, CA 92673, USA',
    mailing_address: '638 Camino De Los Mares, Suite H130-650, San Clemente, CA 92673, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '26-2317116',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from exoduscry.com. Confirm financial documents and Connect account credentials.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/262317116',
    guidestar_url: 'https://www.guidestar.org/profile/26-2317116',
    founded_year: 2008,
    ecfa_member: false,
    bbb_accredited: false,
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Culture change media', 'Policy advocacy', 'Survivor outreach'],
    geographic_scope: GeographicScope.INTERNATIONAL,
    primary_services: ['Documentary films', 'Advocacy campaigns', 'Outreach and aftercare partnerships'],
    leadership_info: {
      ceo: 'Benjamin Nolot',
      vicePresidentOfImpact: 'Helen Taylor'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/exoduscry',
      instagram: 'https://www.instagram.com/exoduscry/',
      twitter: 'https://twitter.com/exoduscry',
      youtube: 'https://www.youtube.com/user/ExodusCry'
    },
    metadata: {
      pressEmail: 'press@exoduscry.com',
      donorSupport: 'donate@exoduscry.com'
    }
  },
  {
    name: 'Shared Hope International',
    legal_name: 'Shared Hope International',
    description: 'Faith-based nonprofit restoring victims of sex trafficking and equipping communities to prevent exploitation.',
    mission: 'Prevent child and youth sex trafficking, restore survivors, and bring justice through informed legislation and training.',
    category: CharityCategory.CHILD_PROTECTION,
    website: 'https://sharedhope.org',
    email: 'savelives@sharedhope.org',
    phone: '+1-866-437-5433',
    address: 'PO Box 1907, Vancouver, WA 98668-1907, USA',
    mailing_address: 'PO Box 1907, Vancouver, WA 98668-1907, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '91-1938635',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from sharedhope.org. Awaiting Stripe onboarding and documentation confirmation.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/911938635',
    guidestar_url: 'https://www.guidestar.org/profile/91-1938635',
    ecfa_member: true,
    ecfa_url: 'https://www.ecfa.org/MemberProfile.aspx?ID=22772',
    bbb_accredited: true,
    bbb_rating: 'A+',
    bbb_url: 'https://www.give.org/charity-reviews/national/human-services/shared-hope-international-in-vancouver-wa-4091',
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Prevention education', 'Policy reform', 'Survivor services'],
    geographic_scope: GeographicScope.NATIONAL,
    primary_services: ['Training resources', 'JuST Conference', 'Policy scorecards'],
    leadership_info: {
      founder: 'Linda Smith',
      president: 'Linda Smith'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/sharedhopeinternational',
      instagram: 'https://www.instagram.com/sharedhopeinternational/',
      twitter: 'https://twitter.com/sharedhope',
      youtube: 'https://www.youtube.com/channel/UCRrTM8a271H02cxKvXkBNHg'
    },
    metadata: {
      hotlineReferral: 'https://sharedhope.org/takeaction/report-trafficking/',
      conferences: ['JuST Conference']
    }
  },
  {
    name: 'Safe Horizon',
    legal_name: 'Safe Horizon, Inc.',
    description: 'The largest victim services organization in the U.S., supporting survivors of trafficking, violence, and abuse in New York City.',
    mission: 'Provide support, prevent violence, and promote justice for victims of crime and abuse, including trafficking survivors.',
    category: CharityCategory.CHILD_PROTECTION,
    website: 'https://www.safehorizon.org',
    email: 'website@safehorizon.org',
    phone: '+1-212-577-7700',
    address: '2 Lafayette Street, 3rd Floor, New York, NY 10007, USA',
    mailing_address: 'PO Box 7084, New York, NY 10150, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '13-2946970',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from safehorizon.org. Confirm direct deposit details and authorize Stripe Connect payouts.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/132946970',
    guidestar_url: 'https://www.guidestar.org/profile/13-2946970',
    founded_year: 1978,
    ecfa_member: false,
    bbb_accredited: true,
    bbb_rating: 'A+',
    bbb_url: 'https://www.give.org/charity-reviews/all/safe-horizon-in-new-york-ny-2793',
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Victim services', 'Legal advocacy', 'Shelter support'],
    geographic_scope: GeographicScope.LOCAL,
    primary_services: ['24/7 hotlines', 'Shelter programs', 'Legal assistance'],
    leadership_info: {
      ceo: 'Liz Roberts'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/SafeHorizonNY/',
      instagram: 'https://www.instagram.com/safehorizon/',
      twitter: 'https://twitter.com/safehorizon',
      youtube: 'https://www.youtube.com/user/SafeHorizonNY'
    },
    metadata: {
      hotline: {
        phone: '1-800-621-4673',
        languages: ['English', 'Spanish']
      },
      mediaContact: 'communications@safehorizon.org'
    }
  },
  {
    name: 'World Vision (Child Protection)',
    legal_name: 'World Vision, Inc.',
    description: 'Christian humanitarian organization safeguarding children and families from exploitation worldwide.',
    mission: 'Protect children from violence and exploitation while partnering with communities to create lasting child well-being.',
    category: CharityCategory.CHILD_PROTECTION,
    website: 'https://www.worldvision.org/our-work/child-protection',
    email: 'info@worldvision.org',
    phone: '+1-888-511-6548',
    address: '34834 Weyerhaeuser Way S, Federal Way, WA 98001, USA',
    mailing_address: 'PO Box 9716, Federal Way, WA 98063-9716, USA',
    country: 'US',
    currency: 'USD',
    tax_id: '95-1922279',
    tax_exempt_status: '501c3',
    is_active: true,
    is_verified: false,
    verification_notes: 'Seeded from worldvision.org child protection hub. Confirm department-level contact and Connect onboarding.',
    charity_navigator_rating: 4.0,
    charity_navigator_url: 'https://www.charitynavigator.org/ein/951922279',
    guidestar_url: 'https://www.guidestar.org/profile/95-1922279',
    ecfa_member: true,
    ecfa_url: 'https://www.ecfa.org/MemberProfile.aspx?ID=5968',
    bbb_accredited: true,
    bbb_rating: 'A+',
    bbb_url: 'https://www.give.org/charity-reviews/national/child-sponsorship/world-vision-in-federal-way-wa-12791',
    total_donations_received: 0,
    total_commitments_count: 0,
    focus_areas: ['Child protection', 'Community development', 'Emergency response'],
    geographic_scope: GeographicScope.INTERNATIONAL,
    primary_services: ['Community programs', 'Advocacy', 'Emergency relief'],
    leadership_info: {
      ceo: 'Edgar Sandoval Sr.',
      childProtectionLead: 'Cheri Williams'
    },
    social_media_links: {
      facebook: 'https://www.facebook.com/worldvision',
      instagram: 'https://www.instagram.com/worldvisionusa/',
      twitter: 'https://twitter.com/WorldVisionUSA',
      youtube: 'https://www.youtube.com/user/WorldVisionUSA'
    },
    metadata: {
      donorServices: 'https://www.worldvision.org/about-us/contact-us',
      programHighlight: 'Big Dream to End Child Marriage initiative'
    }
  }
];

async function seedCharityOrganizations() {
  console.log('🌱 Seeding vetted charity organizations...');

  const transaction = await sequelize.transaction();

  try {
    for (const charity of charities) {
      const [record, created] = await CharityOrganization.findOrCreate({
        where: { name: charity.name },
        defaults: {
          ...charity,
          total_donations_received: charity.total_donations_received ?? 0,
          total_commitments_count: charity.total_commitments_count ?? 0
        },
        transaction
      });

      if (!created) {
        await record.update(
          {
            ...charity,
            total_donations_received: record.total_donations_received,
            total_commitments_count: record.total_commitments_count
          },
          { transaction }
        );
        console.log(`🔁 Updated charity: ${charity.name}`);
      } else {
        console.log(`✅ Created charity: ${charity.name}`);
      }
    }

    await transaction.commit();
    console.log('🎉 Charity organization seeding completed.');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to seed charity organizations:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

if (require.main === module) {
  seedCharityOrganizations()
    .then(() => {
      console.log('✨ Seed script finished successfully.');
    })
    .catch(err => {
      console.error('🚨 Seed script encountered an error.', err);
      process.exitCode = 1;
    });
}

export default seedCharityOrganizations;
