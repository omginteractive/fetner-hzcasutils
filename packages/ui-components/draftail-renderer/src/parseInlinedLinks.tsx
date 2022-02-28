import createElement from './createElement';
import {BlockWithEntityMap, InlineStyleRange, EntityRange} from './types';

function getSubstringByOffset(
  text: string,
  offset: number,
  length: number,
): string {
  let word = text.substr(offset, length);
  return word;
}

function setStyles(
  matchingStyles: {
    style: string;
    offset: number;
    length: number;
  }[],
): {} | {fontWeight?: string; fontStyle?: string} {
  const styles = {};
  matchingStyles.forEach(style => {
    if (style.style === 'BOLD') {
      Object.assign(styles, {fontWeight: 'bold'});
    }
    if (style.style === 'ITALIC') {
      Object.assign(styles, {fontStyle: 'italic'});
    }
  });
  return styles;
}

function mapStyles(
  inlineStyleRanges: InlineStyleRange[],
  entityRange: EntityRange,
): (InlineStyleRange | undefined)[] {
  const matchingStyles: (InlineStyleRange | undefined)[] = [];
  inlineStyleRanges.forEach(inlineStyle => {
    if (inlineStyle.offset === entityRange.offset) {
      matchingStyles.push(inlineStyle);
    }
  });
  return matchingStyles;
}

export default function parseInlinedLinks(
  block: BlockWithEntityMap,
): (JSX.Element | string)[] {
  const {text, entityRanges, entityMap, inlineStyleRanges} = block;
  const linksWithinBlock: BlockWithEntityMap[] = [];

  for (const entityRange of entityRanges) {
    let word = getSubstringByOffset(
      block.text,
      entityRange.offset,
      entityRange.length,
    );
    linksWithinBlock.push({
      text: word,
      style: mapStyles(inlineStyleRanges, entityRange),
      ...entityMap[entityRange.key],
    });
  }

  const slotsForLinkText = Array(entityRanges.length).fill('');
  let pointer = 0;

  return [...text].reduce(
    (accum: (string | JSX.Element)[], currVal: string, i: number) => {
      let currentEntity = entityRanges[pointer];
      let {offset, length} = currentEntity;
      let char = currVal;
      if (i === offset || (i > offset && i < offset + length)) {
        slotsForLinkText[pointer] += char;
        if (slotsForLinkText[pointer] === linksWithinBlock[pointer].text) {
          accum.push(
            createElement('a', {
              key: linksWithinBlock[pointer].text,
              href: linksWithinBlock[pointer].data.url,
              children: linksWithinBlock[pointer].text,
              style: setStyles(linksWithinBlock[pointer].style),
            }),
          );
          if (pointer < entityRanges.length - 1) {
            pointer++;
          }
        }
      } else {
        accum.push(char);
      }
      return accum;
    },
    [],
  );
}
