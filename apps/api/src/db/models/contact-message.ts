import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

/** A message sent through the contact form. Deleted after 12 months (SP-9). */
export class ContactMessage extends Model<
  InferAttributes<ContactMessage>,
  InferCreationAttributes<ContactMessage>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare message: string;
  /** Salted SHA-256 of the sender's IP: enough to rate-limit, not enough to identify. */
  declare ipHash: string;
  declare userAgent: string | null;
  /** False when the message arrived without the bot check (no JavaScript). */
  declare botChecked: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function initContactMessageModel(sequelize: Sequelize): void {
  ContactMessage.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      ipHash: { type: DataTypes.CHAR(64), allowNull: false },
      userAgent: { type: DataTypes.STRING(300), allowNull: true },
      botChecked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, tableName: "contact_messages", updatedAt: false },
  );
}
