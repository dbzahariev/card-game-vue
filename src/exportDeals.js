import {
  AlignmentType, BorderStyle, Document, HeightRule, Packer, Paragraph,
  Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';

const suits = ['♠', '♥', '♦', '♣'];
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const borders = Object.fromEntries(
  ['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
    .map(side => [side, noBorder]),
);
const compact = { before: 0, after: 0, line: 200, lineRule: 'exact' };

function paragraph(text, { center = false, bold = false, color = '000000' } = {}) {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: compact,
    children: [new TextRun({ text, bold, color, font: 'Arial', size: 17 })],
  });
}

function handLines(hands, player, center = false) {
  const hand = hands.find(hand => hand.player === player);
  return suits.map(suit => {
    const ranks = hand.cards.filter(card => card.suit === suit).map(card => card.rank);
    return paragraph(`${suit} ${ranks.join(' ') || '—'}`, {
      center, color: suit === '♥' || suit === '♦' ? 'BD303B' : '000000',
    });
  });
}

function cell(children, width, extra = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders, margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlign.CENTER,
    children, ...extra,
  });
}

function board(hands, number) {
  const label = player => paragraph(player, { center: true, bold: true });
  const table = new Table({
    width: { size: 5000, type: WidthType.DXA },
    columnWidths: [2150, 350, 350, 2150],
    layout: TableLayoutType.FIXED,
    borders,
    rows: [
      new TableRow({ children: [cell([
        ...handLines(hands, 'N', true), label('N'),
      ], 5000, { columnSpan: 4 })] }),
      new TableRow({ children: [
        cell(handLines(hands, 'W'), 2150),
        cell([label('W')], 350),
        cell([label('E')], 350),
        cell(handLines(hands, 'E'), 2150),
      ] }),
      new TableRow({ children: [cell([
        label('S'), ...handLines(hands, 'S', true),
      ], 5000, { columnSpan: 4 })] }),
    ],
  });
  return [
    paragraph(`Раздаване ${number}`, { center: true, bold: true }),
    table,
    new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' } }),
  ];
}

export function buildDealsDocument(deals) {
  if (!deals.length) throw new Error('Няма раздавания за експорт.');
  const children = [];
  for (let start = 0; start < deals.length; start += 6) {
    if (start) children.push(new Paragraph({ pageBreakBefore: true, spacing: compact }));
    const page = deals.slice(start, start + 6);
    const rows = [];
    for (let row = 0; row < Math.ceil(page.length / 2); row++) {
      rows.push(new TableRow({
        cantSplit: true,
        height: { value: 4700, rule: HeightRule.ATLEAST },
        children: [0, 1].map(column => {
          const index = row * 2 + column;
          return cell(page[index] ? board(page[index], start + index + 1) : [paragraph('')], 5233, {
            margins: { top: 80, bottom: 80, left: 116, right: 116 },
          });
        }),
      }));
    }
    children.push(new Table({
      width: { size: 10466, type: WidthType.DXA },
      columnWidths: [5233, 5233], layout: TableLayoutType.FIXED, borders, rows,
    }));
  }
  return new Document({
    title: 'Бридж раздавания',
    styles: { default: { document: { run: { font: 'Arial', size: 17 }, paragraph: { spacing: compact } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    }],
  });
}

export async function downloadDeals(deals) {
  const blob = await Packer.toBlob(buildDealsDocument(deals));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bridge-deals.docx';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
