import { DataTypes } from "sequelize";
import type { StepContext } from "../migrator";

/**
 * Marks contact messages that arrived without the bot check (a plain form post from a browser
 * without JavaScript), so they can be capped site-wide each day and flagged in the alert email.
 * Existing messages all passed the check.
 */
export async function up({ queryInterface, transaction }: StepContext): Promise<void> {
  await queryInterface.addColumn(
    "contact_messages",
    "bot_checked",
    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    { transaction },
  );
  // The daily cap counts only the unchecked ones: a small partial index serves it.
  await queryInterface.addIndex("contact_messages", ["created_at"], {
    name: "contact_messages_unchecked_idx",
    where: { bot_checked: false },
    transaction,
  });
}

export async function down({ queryInterface, transaction }: StepContext): Promise<void> {
  await queryInterface.removeIndex("contact_messages", "contact_messages_unchecked_idx", {
    transaction,
  });
  await queryInterface.removeColumn("contact_messages", "bot_checked", { transaction });
}
