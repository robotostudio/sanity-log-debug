import { relations } from "drizzle-orm/relations";
import { files, uploadSessions, user, account, session, userProfile, batchProgress, uploadChunks, logRecords } from "./schema";

export const uploadSessionsRelations = relations(uploadSessions, ({one, many}) => ({
	file: one(files, {
		fields: [uploadSessions.fileId],
		references: [files.id]
	}),
	user: one(user, {
		fields: [uploadSessions.userId],
		references: [user.id]
	}),
	uploadChunks: many(uploadChunks),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	uploadSessions: many(uploadSessions),
	batchProgresses: many(batchProgress),
	user: one(user, {
		fields: [files.userId],
		references: [user.id]
	}),
	logRecords: many(logRecords),
}));

export const userRelations = relations(user, ({many}) => ({
	uploadSessions: many(uploadSessions),
	accounts: many(account),
	sessions: many(session),
	userProfiles: many(userProfile),
	files: many(files),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userProfileRelations = relations(userProfile, ({one}) => ({
	user: one(user, {
		fields: [userProfile.userId],
		references: [user.id]
	}),
}));

export const batchProgressRelations = relations(batchProgress, ({one}) => ({
	file: one(files, {
		fields: [batchProgress.fileId],
		references: [files.id]
	}),
}));

export const uploadChunksRelations = relations(uploadChunks, ({one}) => ({
	uploadSession: one(uploadSessions, {
		fields: [uploadChunks.sessionId],
		references: [uploadSessions.id]
	}),
}));

export const logRecordsRelations = relations(logRecords, ({one}) => ({
	file: one(files, {
		fields: [logRecords.fileId],
		references: [files.id]
	}),
}));