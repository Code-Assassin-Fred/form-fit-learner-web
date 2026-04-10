import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function readCollection(collection) {
  const filePath = path.join(process.cwd(), 'local_data', `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    if (collection === 'classes') return [{id: 'class1', name: 'General Ergonomics', progress: 40}];
    if (collection === 'tasks') return [{id: 'task1', title: 'Review Learner Profiles', dueDate: 'Today', icon: '📋'}];
    if (collection === 'activities') return [{id: 'act1', type: 'assessment', message: 'Ready for new scan'}];
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export async function GET(req) {
  const { pathname } = new URL(req.url);
  const collection = pathname.split('/').pop();
  return NextResponse.json(readCollection(collection));
}
