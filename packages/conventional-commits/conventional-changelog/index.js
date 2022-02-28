const fs = require('fs');
const path = require('path');
const emojiTypes = require('@hzdg/gitmoji');

const parserOpts = {
  headerPattern: /^([^(\s]*)(?: \(([\w$./@\-* ]*)\))? (.*)$/,
  headerCorrespondence: ['type', 'scope', 'subject'],
};

function whatBump(commits) {
  let level = 2;
  let breakings = 0;
  let features = 0;

  for (const commit of commits) {
    for (const emojiType of emojiTypes) {
      if (emojiType.emoji === commit.type || emojiType.code === commit.type) {
        switch (emojiType.level) {
          case 0:
            breakings += 1;
            level = 0;
            break;
          case 1:
            features += 1;
            level = Math.min(level, 1);
            break;
          case 2:
            break;
          default:
            if (commit.notes.length > 0) {
              breakings += commit.notes.length;
              level = 0;
            }
            break;
        }
        break;
      }
    }
  }

  return {
    level,
    reason: `There are ${breakings} BREAKING CHANGES and ${features} features`,
  };
}

const writerOpts = {
  mainTemplate: fs.readFileSync(
    path.resolve(__dirname, `./templates/template.hbs`),
    `utf-8`,
  ),
  headerPartial: fs.readFileSync(
    path.resolve(__dirname, `./templates/header.hbs`),
    `utf-8`,
  ),
  commitPartial: fs.readFileSync(
    path.resolve(__dirname, `./templates/commit.hbs`),
    `utf-8`,
  ),
  transform(commit) {
    if (!commit.type || typeof commit.type !== 'string') {
      return;
    }
    const maxLength = 72;
    commit.type = commit.type.substring(0, maxLength);
    if (typeof commit.hash === `string`) {
      commit.hash = commit.hash.substring(0, 7);
    }
    if (typeof commit.subject === `string`) {
      commit.subject = commit.subject.substring(
        0,
        maxLength - commit.type.length,
      );
    }
    return commit;
  },
  groupBy: `scope`,
  commitGroupsSort: `type`,
  commitsSort: [`type`, `subject`],
};

module.exports = {
  conventionalChangelog: {parserOpts, writerOpts},
  recommendedBumpOpts: {parserOpts, whatBump},
  parserOpts,
  writerOpts,
};
