import fs from 'fs/promises';
import path from 'path';
import { UserData } from '../types/user';

const DATA_DIR = path.join(process.cwd(), 'user_data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveUserData(userId: number, data: Partial<UserData>): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${userId}.json`);
  let existing: UserData = { userId };
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existing = JSON.parse(content);
  } catch {}
  const merged = { ...existing, ...data, userId };
  await fs.writeFile(filePath, JSON.stringify(merged, null, 2));
}

export async function loadUserData(userId: number): Promise<UserData | null> {
  try {
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
