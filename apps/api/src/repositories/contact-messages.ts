import { Op, type Sequelize } from "sequelize";
import { ContactMessage } from "../db";

export interface NewMessage {
  name: string;
  email: string;
  message: string;
  ipHash: string;
  userAgent: string | null;
  /** False when the message came without the bot check. */
  botChecked: boolean;
}

export interface StoreLimits {
  /** Messages one sender may send since `windowStart`. */
  limit: number;
  windowStart: Date;
  windowMs: number;
  /** For a message without the bot check: how many such messages everyone may send since then. */
  unchecked?: { limit: number; windowStart: Date; windowMs: number };
}

export type StoreResult =
  | { stored: true; id: string; createdAt: Date }
  /**
   * Not stored: the sender reached their limit ("sender"), or the day's allowance of messages
   * without the bot check is used up ("unchecked"). Sending works again at `retryAt`.
   */
  | { stored: false; limit: "sender" | "unchecked"; retryAt: Date };

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
    { limit, windowStart, windowMs, unchecked }: StoreLimits,
  ): Promise<StoreResult> {
    return this.sequelize.transaction(async (transaction) => {
      // The site-wide allowance first (always this lock before a sender's, so no deadlock).
      if (unchecked !== undefined) {
        await this.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended($key, 0))", {
          bind: { key: "contact-unchecked" },
          transaction,
        });
        const today = await ContactMessage.findAll({
          attributes: ["createdAt"],
          where: { botChecked: false, createdAt: { [Op.gte]: unchecked.windowStart } },
          order: [["createdAt", "ASC"]],
          transaction,
        });
        const first = today[0];
        if (unchecked.limit === 0 || (today.length >= unchecked.limit && first !== undefined)) {
          const from = first?.createdAt ?? unchecked.windowStart;
          return {
            stored: false,
            limit: "unchecked",
            retryAt: new Date(from.getTime() + unchecked.windowMs),
          };
        }
      }

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
        return {
          stored: false,
          limit: "sender",
          retryAt: new Date(oldest.createdAt.getTime() + windowMs),
        };
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
