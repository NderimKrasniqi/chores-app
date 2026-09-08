import fs from 'node:fs';
import path from 'node:path';

const convexRoot =
  path.resolve(
    'convex',
  );

const registrationPattern =
  /\b(query|mutation|action|internalQuery|internalMutation|internalAction)\s*\(\s*\{/g;

function collectTypeScriptFiles(
  directory,
) {
  const files = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      {
        withFileTypes:
          true,
      },
    )
  ) {
    const fullPath =
      path.join(
        directory,
        entry.name,
      );

    if (
      entry.isDirectory()
    ) {
      if (
        entry.name ===
          '_generated' ||
        entry.name ===
          'dev'
      ) {
        continue;
      }

      files.push(
        ...collectTypeScriptFiles(
          fullPath,
        ),
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(
        '.ts',
      )
    ) {
      files.push(
        fullPath,
      );
    }
  }

  return files;
}

const missing = [];

for (
  const file of
  collectTypeScriptFiles(
    convexRoot,
  )
) {
  const source =
    fs.readFileSync(
      file,
      'utf8',
    );

  registrationPattern.lastIndex =
    0;

  for (
    const match of
    source.matchAll(
      registrationPattern,
    )
  ) {
    const handlerIndex =
      source.indexOf(
        'handler:',
        match.index,
      );

    if (
      handlerIndex ===
      -1
    ) {
      continue;
    }

    const contractSection =
      source.slice(
        match.index,
        handlerIndex,
      );

    if (
      /\breturns\s*:/.test(
        contractSection,
      )
    ) {
      continue;
    }

    const line =
      source
        .slice(
          0,
          match.index,
        )
        .split(
          '\n',
        )
        .length;

    missing.push(
      `${path.relative(
        process.cwd(),
        file,
      )}:${line}`,
    );
  }
}

if (
  missing.length >
  0
) {
  console.error(
    'Production Convex functions missing explicit returns:',
  );

  for (
    const entry of
    missing
  ) {
    console.error(
      `- ${entry}`,
    );
  }

  process.exit(
    1,
  );
}

console.log(
  'Convex return-contract verification passed.',
);
