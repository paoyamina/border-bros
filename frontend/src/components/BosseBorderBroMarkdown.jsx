import React from 'react';

// Renderizador acotado a respuestas de BorderBro. Nunca interpreta HTML del modelo.
// No requiere bibliotecas adicionales ni dangerouslySetInnerHTML.
const header = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/;
const bullet = /^\s{0,3}[-*+]\s+(.+)$/;
const numbered = /^\s{0,3}\d+[.)]\s+(.+)$/;
const quote = /^\s{0,3}>\s?(.*)$/;
const rule = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const tableSeparator = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const inlinePattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;

const tableCells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
const allowedLink = raw => {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch (_) { return null; }
};

function inline(text, prefix) {
  const result = [];
  const source = String(text || '');
  const pattern = new RegExp(inlinePattern.source, 'g');
  let match;
  let last = 0;
  let n = 0;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) result.push(source.slice(last, match.index));
    const key = `${prefix}-${n++}`;
    if (match[2] && match[3]) {
      const url = allowedLink(match[3]);
      result.push(url ? <a key={key} href={url} target="_blank" rel="noopener noreferrer">{match[2]}</a> : match[0]);
    } else if (match[4] || match[5]) result.push(<strong key={key}>{match[4] || match[5]}</strong>);
    else if (match[6]) result.push(<code key={key}>{match[6]}</code>);
    else if (match[7] || match[8]) result.push(<em key={key}>{match[7] || match[8]}</em>);
    last = pattern.lastIndex;
  }
  if (last < source.length) result.push(source.slice(last));
  return result.length ? result : source;
}

function isBlockStart(line, next) {
  return header.test(line) || bullet.test(line) || numbered.test(line) || quote.test(line) ||
    rule.test(line) || /^\s{0,3}```/.test(line) || (line.includes('|') && tableSeparator.test(next || ''));
}

export default function BosseBorderBroMarkdown({ text }) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let block = 0;
  const add = node => blocks.push(<React.Fragment key={`md-${block++}`}>{node}</React.Fragment>);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^\s{0,3}```\s*([\w+-]*)/);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s{0,3}```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      add(<pre className="bbai-md-code"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (rule.test(line)) { add(<hr/>); i++; continue; }
    const heading = line.match(header);
    if (heading) {
      const depth = Math.min(heading[1].length, 4);
      const Tag = `h${depth + 1}`; // El título de la página es h1.
      add(<Tag>{inline(heading[2], `h-${block}`)}</Tag>);
      i++; continue;
    }
    if (line.includes('|') && tableSeparator.test(lines[i + 1] || '')) {
      const labels = tableCells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(tableCells(lines[i++]));
      add(<div className="bbai-md-table-wrap"><table><thead><tr>{labels.map((cell, c) => <th key={c}>{inline(cell, `th-${block}-${c}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row, r) => <tr key={r}>{labels.map((_, c) => <td key={c}>{inline(row[c] || '', `td-${block}-${r}-${c}`)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const matcher = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length) {
        const entry = lines[i].match(matcher);
        if (!entry) break;
        items.push(entry[1]); i++;
      }
      const ItemList = ordered ? 'ol' : 'ul';
      add(<ItemList>{items.map((item, n) => <li key={n}>{inline(item, `li-${block}-${n}`)}</li>)}</ItemList>);
      continue;
    }
    if (quote.test(line)) {
      const parts = [];
      while (i < lines.length && quote.test(lines[i])) parts.push(lines[i++].match(quote)[1]);
      add(<blockquote>{parts.map((part, n) => <React.Fragment key={n}>{n > 0 && <br/>}{inline(part, `q-${block}-${n}`)}</React.Fragment>)}</blockquote>);
      continue;
    }
    const parts = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) parts.push(lines[i++]);
    add(<p>{parts.map((part, n) => <React.Fragment key={n}>{n > 0 && <br/>}{inline(part, `p-${block}-${n}`)}</React.Fragment>)}</p>);
  }
  return <div className="bbai-markdown">{blocks}</div>;
}
