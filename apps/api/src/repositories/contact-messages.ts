import { Op, type Sequelize } from "sequelize";
import { ContactMessage } from "../db";

export interface NewMessage {
  name: string;
  email: string;
  message: string;
  ipHash: string;
  userAgent: string | null;
}

export type StoreResult =
  | { stored: true; id: string; createdAt: Date }
  /** The sender reached the limit; they may send again at `retryAt`. */
  | { stored: false; retryAt: Date };

/** Writes and expires contact messages. */
export class ContactMessageRepository {
  constructor(private readonly sequelize: Sequelize) {}

  /**
   * Stores a message unless the sender has already sent `limit` since `windowStart`. The check and
   * the insert run in one transaction under a lock on the sender's hash, so parallel requests
   * from one sender cannot slip past the limit.
   */
  storeWithinLimit(
    message: NewMessage,
    { limit, windowStart, windowMs }: { limit: number; windowStart: Date; windowMs: number },
  ): Promise<StoreResult> {
    return this.sequelize.transaction(async (transaction) => {
      await this.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended($hash, 0))", {
        bind: { hash: message.ipHash },
        transaction,
      });

      const recent = await ContactMessage.findAll({
        attributes: ["createdAt"],
        where: { ipHash: message.ipHash, createdAt: { [Op.gte]: windowStart } },
        order: [["createdAt", "ASC"]],
        transaction,
      });
      const oldest = recent[0];
      if (recent.length >= limit && oldest !== undefined) {
        return { stored: false, retryAt: new Date(oldest.createdAt.getTime() + windowMs) };
      }

      const created = await ContactMessage.create(message, { transaction });
      return { stored: true, id: created.id, createdAt: created.createdAt };
    });
  }

  /** Deletes every message received before the given time. Returns how many went. */
  deleteOlderThan(before: Date): Promise<number> {
    return ContactMessage.destroy({ where: { createdAt: { [Op.lt]: before } } });
  }
}
