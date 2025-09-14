import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IArticle {
  id: number;
  slug: string;
  title: string;
  summary?: string | null;
  content: string; // Markdown / rich text
  references?: Array<{ type?: string; label: string; url?: string }>| null; // stored as JSON
  tags?: string[] | null;
  category?: string | null;
  version?: number; // to handle future edits
  createdAt?: Date;
  updatedAt?: Date;
}

type ArticleCreation = Optional<IArticle, 'id' | 'summary' | 'references' | 'tags' | 'category' | 'version'>;

class Article extends Model<IArticle, ArticleCreation> implements IArticle {
  public id!: number;
  public slug!: string;
  public title!: string;
  public summary!: string | null;
  public content!: string;
  public references!: Array<{ type?: string; label: string; url?: string }> | null;
  public tags!: string[] | null;
  public category!: string | null;
  public version!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Article.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    summary: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    references: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Article',
    tableName: 'articles',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['slug'] },
      { fields: ['category'] },
    ],
  }
);

export default Article;
