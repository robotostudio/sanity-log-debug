import { relations } from "drizzle-orm";
import { user, session, account } from "./auth-schema";
import {
  files,
  logRecords,
  batchProgress,
  uploadSessions,
  uploadChunks,
} from "./logs-schema";
import { userProfile } from "./user-profile-schema";

// ============================================================================
// Auth Relations
// ============================================================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  files: many(files),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// Logs Relations
// ============================================================================

export const filesRelations = relations(files, ({ many, one }) => ({
  logRecords: many(logRecords),
  batchProgress: many(batchProgress),
  uploadSession: one(uploadSessions, {
    fields: [files.id],
    references: [uploadSessions.fileId],
  }),
  owner: one(user, {
    fields: [files.userId],
    references: [user.id],
  }),
}));

export const logRecordsRelations = relations(logRecords, ({ one }) => ({
  file: one(files, {
    fields: [logRecords.fileId],
    references: [files.id],
  }),
}));

export const batchProgressRelations = relations(batchProgress, ({ one }) => ({
  file: one(files, {
    fields: [batchProgress.fileId],
    references: [files.id],
  }),
}));

export const uploadSessionsRelations = relations(
  uploadSessions,
  ({ one, many }) => ({
    file: one(files, {
      fields: [uploadSessions.fileId],
      references: [files.id],
    }),
    chunks: many(uploadChunks),
  }),
);

export const uploadChunksRelations = relations(uploadChunks, ({ one }) => ({
  session: one(uploadSessions, {
    fields: [uploadChunks.sessionId],
    references: [uploadSessions.id],
  }),
}));
