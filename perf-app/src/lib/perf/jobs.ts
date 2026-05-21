/**
 * In-memory job queue + EventEmitter dla SSE.
 *
 * Każdy audit to "job" - identyfikowany ID, śledzony w pamięci, emitujący
 * eventy progress. Klient subskrybuje przez Server-Sent Events.
 *
 * Persystencja: tylko gotowy raport (na dysk). Job state znika po restarcie -
 * to OK dla MVP, do produkcji dorzucić Redis / SQLite.
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { Job, JobProgress, JobStatus } from './types.js';

const jobs = new Map<string, Job>();
const emitters = new Map<string, EventEmitter>();

export interface CreateJobInput {
  url: string;
  profileId: string;
  runs: number;
}

export function createJob(input: CreateJobInput): Job {
  const job: Job = {
    id: randomUUID(),
    status: 'pending',
    url: input.url,
    profileId: input.profileId,
    runs: input.runs,
    createdAt: new Date().toISOString(),
    progress: [],
  };
  jobs.set(job.id, job);
  emitters.set(job.id, new EventEmitter());
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function setJobStatus(id: string, status: JobStatus): void {
  const job = jobs.get(id);
  if (job) job.status = status;
}

export function getEmitter(id: string): EventEmitter | undefined {
  return emitters.get(id);
}

export function pushProgress(id: string, progress: Omit<JobProgress, 'timestamp'>): void {
  const job = jobs.get(id);
  const em = emitters.get(id);
  if (!job || !em) return;
  const full: JobProgress = { ...progress, timestamp: new Date().toISOString() };
  job.progress.push(full);
  em.emit('progress', full);
}

export function finishJob(id: string, reportId: string): void {
  const job = jobs.get(id);
  const em = emitters.get(id);
  if (!job || !em) return;
  job.status = 'done';
  job.reportId = reportId;
  job.finishedAt = new Date().toISOString();
  em.emit('finished', reportId);
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id);
  const em = emitters.get(id);
  if (!job || !em) return;
  job.status = 'failed';
  job.error = error;
  job.finishedAt = new Date().toISOString();
  em.emit('failed', error);
}

/** Cleanup po godzinie - żeby Map nie rosła bez końca */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const JOB_TTL_MS = 60 * 60 * 1000; // 1h
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    const finishedAt = job.finishedAt ? Date.parse(job.finishedAt) : null;
    if (finishedAt && now - finishedAt > JOB_TTL_MS) {
      jobs.delete(id);
      emitters.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS).unref?.();
