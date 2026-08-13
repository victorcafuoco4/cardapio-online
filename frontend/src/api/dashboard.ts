import { apiAutenticada } from './http';
import type { ResumoDashboard } from '../types';

export function buscarResumoDashboard(): Promise<ResumoDashboard> {
  return apiAutenticada<ResumoDashboard>('/dashboard');
}
