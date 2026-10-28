// Seeds the launch content from scripts/seed/fixtures.mjs into Firestore.
//
//   npm run seed -- --project <firebaseProjectId>           Dry run: prints the plan.
//   npm run seed -- --project <firebaseProjectId> --apply   Applies it in one transaction.
//
// Missing documents are created; existing documents only get their absent fields filled.
// Existing values are never overwritten, so running it again is safe.
import { parseArgs } from 'node:util';
import { db } from '../src/server/firebase.ts';
import { validateDocument } from '../src/server/schema.ts';
import { fixtures } from './seed/fixtures.mjs';

const USAGE = 'Usage: npm run seed -- --project <firebaseProjectId> [--apply]';

const projectFixtures = fixtures.filter(({ path }) => path.startsWith('projects/'));
const isAbsent = (value) => value === undefined || value === null;
const print = (line = '') => process.stdout.write(`${line}\n`);

function readOptions() {
  let values;
  try {
    ({ values } = parseArgs({
      options: { project: { type: 'string' }, apply: { type: 'boolean', default: false } },
      strict: true,
    }));
  } catch (error) {
    throw new Error(`${error.message}\n${USAGE}`);
  }
  if (!values.project) throw new Error(USAGE);
  // Naming the project on the command line guards against seeding whatever .env points to.
  if (values.project !== process.env.FIREBASE_PROJECT_ID) {
    throw new Error(
      `--project ${values.project} does not match FIREBASE_PROJECT_ID ` +
        `(${process.env.FIREBASE_PROJECT_ID ?? 'unset'}). Check .env and .env.local.`,
    );
  }
  return values;
}

function checkFixtures() {
  const paths = fixtures.map(({ path }) => path);
  if (new Set(paths).size !== paths.length) throw new Error('Duplicate fixture paths');
  const slugs = projectFixtures.map(({ data }) => data.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate project slugs in fixtures');
}

function planDocument(fixture, snapshot) {
  if (!snapshot.exists) {
    validateDocument(fixture.path, fixture.data);
    return { path: fixture.path, action: 'create', fields: [], data: fixture.data };
  }
  const current = snapshot.data();
  const patch = Object.fromEntries(
    Object.entries(fixture.data).filter(([key]) => isAbsent(current[key])),
  );
  validateDocument(fixture.path, { ...current, ...patch });
  const fields = Object.keys(patch);
  return { path: fixture.path, action: fields.length ? 'fill' : 'up to date', fields, data: patch };
}

/** Throws if another project already uses one of the fixture slugs. */
function checkSlugConflicts(slugSnapshots) {
  slugSnapshots.forEach((snapshot, index) => {
    const { path, data } = projectFixtures[index];
    const others = snapshot.docs.filter((doc) => doc.ref.path !== path);
    if (others.length) {
      throw new Error(
        `Slug "${data.slug}" is already used by ${others.map((doc) => doc.ref.path).join(', ')}`,
      );
    }
  });
}

function buildPlan(snapshots, slugSnapshots) {
  checkSlugConflicts(slugSnapshots);
  return fixtures.map((fixture, index) => planDocument(fixture, snapshots[index]));
}

function report(projectId, apply, plan) {
  print(`Firebase project ${projectId}: ${apply ? 'applied' : 'dry run (add --apply to write)'}`);
  for (const { path, action, fields } of plan) {
    print(`  ${action.padEnd(10)}  ${path}${fields.length ? `: ${fields.join(', ')}` : ''}`);
  }
  const count = (action) => plan.filter((step) => step.action === action).length;
  print(
    `${plan.length} documents: ${count('create')} to create, ${count('fill')} to fill, ` +
      `${count('up to date')} up to date.`,
  );
}

async function main() {
  const options = readOptions();
  checkFixtures();

  const database = db();
  const refs = fixtures.map(({ path }) => database.doc(path));
  const slugQueries = projectFixtures.map(({ data }) =>
    database.collection('projects').where('slug', '==', data.slug),
  );

  try {
    let plan;
    if (options.apply) {
      plan = await database.runTransaction(async (transaction) => {
        const [snapshots, ...slugSnapshots] = await Promise.all([
          transaction.getAll(...refs),
          ...slugQueries.map((query) => transaction.get(query)),
        ]);
        const steps = buildPlan(snapshots, slugSnapshots);
        for (const step of steps) {
          const ref = database.doc(step.path);
          if (step.action === 'create') transaction.create(ref, step.data);
          if (step.action === 'fill') transaction.update(ref, step.data);
        }
        return steps;
      });
    } else {
      const [snapshots, ...slugSnapshots] = await Promise.all([
        database.getAll(...refs),
        ...slugQueries.map((query) => query.get()),
      ]);
      plan = buildPlan(snapshots, slugSnapshots);
    }
    report(options.project, options.apply, plan);
  } finally {
    await database.terminate();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
