import fs from 'node:fs';
import { solveOnline, solveOffline } from './DependencyProvider.js';

console.log('Solving online:');

const result = solveOnline(
  fs.readFileSync('elm.json', 'utf-8'),
  {},
  false
);

console.log("result:", result);

process.exit(0);