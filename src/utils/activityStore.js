import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'activity.json');

export function addActivity(activity) {
  let data = [];
  try {
    if (fs.existsSync(DB_PATH)) {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading activity file", e);
  }
  
  data.unshift({
    ...activity,
    timestamp: Date.now()
  });
  
  // Keep only the last 100 activities
  if (data.length > 100) data = data.slice(0, 100);
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error writing activity file", e);
  }
}

export function getActivity(address) {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (address) {
         const lowerAddr = address.toLowerCase();
         return data.filter(a => a.sender.toLowerCase() === lowerAddr || a.target.toLowerCase() === lowerAddr);
      }
      return data;
    }
  } catch (e) {}
  return [];
}
