import { describe, expect, it } from 'vitest';

import {
  buildScheduleCsv,
  buildScheduleExcelBuffer,
  buildScheduleExportWorkbook,
  getExportSuccessMessage,
  getScheduleExportFilename,
} from '@/lib/scheduleExport';
import ExcelJS from 'exceljs';
import type { Dependency, Person, Section, Task } from '@/types/scheduling';

const sections: Section[] = [
  { id: 'fitoff', name: 'Fitoff', order: 2 },
  { id: 'slab', name: 'Slab', order: 1 },
];

const people: Person[] = [
  {
    id: 'p-builder',
    name: 'Alex Builder',
    userGroup: 'Internal',
    company: 'Solva Homes',
    trade: 'Site manager',
    phone: '021 000 000',
    email: 'alex@example.test',
  },
  {
    id: 'p-supplier',
    name: 'Tile Supplier',
    userGroup: 'Suppliers',
    company: 'Tiles Ltd',
    trade: 'Tiles',
  },
];

const tasks: Task[] = [
  {
    id: 'task-tiles',
    name: 'Order tiles, grout and trims',
    taskType: 'Ordering',
    sectionId: 'fitoff',
    startDate: '2026-06-08',
    endDate: '2026-06-12',
    duration: 5,
    assignedTo: ['p-supplier'],
    userGroup: 'Suppliers',
    status: 'Booked',
    comments: ['Confirm colour "warm white"', 'Client approval required'],
  },
  {
    id: 'task-slab',
    name: 'Pour slab',
    taskType: 'Internal',
    sectionId: 'slab',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    duration: 3,
    assignedTo: ['p-builder', 'missing-person'],
    userGroup: 'Internal',
    status: 'In Progress',
    comments: ['Weather dependent'],
  },
];

const dependencies: Dependency[] = [
  {
    id: 'dep-1',
    predecessorId: 'task-slab',
    successorId: 'task-tiles',
    lagDays: 2,
    autoShift: true,
    notes: 'Confirm slab cure',
  },
];

describe('schedule export', () => {
  it('builds readable CSV with sorted sections, escaped comments, names, and dependencies', () => {
    const csv = buildScheduleCsv({
      sections,
      tasks,
      people,
      dependencies,
    });

    expect(csv.split('\r\n')[0]).toBe(
      'Section,Task,Type,Status,Start date,End date,Duration,Assigned,Waiting On,Comments',
    );
    expect(csv).toContain(
      'Slab,Pour slab,Internal,In Progress,2026-06-01,2026-06-03,3,Alex Builder; missing-person,,Weather dependent',
    );
    expect(csv).toContain(
      'Fitoff,"Order tiles, grout and trims",Ordering,Booked,2026-06-08,2026-06-12,5,Tile Supplier,Pour slab finishes first + 2 days; auto-shift on; Confirm slab cure,"Confirm colour ""warm white"" | Client approval required"',
    );
  });

  it('builds an Excel workbook model with schedule, people, and attention sheets', () => {
    const workbook = buildScheduleExportWorkbook({
      projectName: 'Brown Town Duplex',
      exportedAt: new Date('2026-06-15T12:00:00.000Z'),
      sections,
      tasks,
      people,
      dependencies,
    });

    expect(workbook.fileName).toBe('brown-town-duplex-2026-06-15.xlsx');
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual([
      'Schedule',
      'People',
      'Attention',
    ]);

    expect(workbook.sheets[0].rows[0]).toEqual(['Project Schedule Export']);
    expect(workbook.sheets[0].rows[1]).toEqual(['Project', 'Brown Town Duplex']);
    expect(workbook.sheets[0].rows[2]).toEqual(['Export date', '2026-06-15']);
    expect(workbook.sheets[0].rows[4]).toEqual([
      'Section',
      'Task',
      'Type',
      'Status',
      'Start date',
      'End date',
      'Duration',
      'Assigned',
      'Waiting On',
      'Comments',
    ]);
    expect(workbook.sheets[0].rows[6]).toContain('Tile Supplier');
    expect(workbook.sheets[0].rows[6]).toContain(
      'Pour slab finishes first + 2 days; auto-shift on; Confirm slab cure',
    );

    expect(workbook.sheets[1].rows[0]).toEqual([
      'Name',
      'Group',
      'Company',
      'Trade / role',
      'Phone',
      'Email',
      'Notes',
    ]);
    expect(workbook.sheets[2].rows).toContainEqual([
      'Booked',
      'Fitoff',
      'Order tiles, grout and trims',
      '2026-06-08',
      '2026-06-12',
      'Tile Supplier',
      'Pour slab finishes first + 2 days; auto-shift on; Confirm slab cure',
    ]);
  });

  it('creates safe dated export filenames', () => {
    expect(
      getScheduleExportFilename('Client / House: Stage #2', new Date('2026-06-15T12:00:00.000Z'), 'csv'),
    ).toBe('client-house-stage-2-2026-06-15.csv');
    expect(
      getScheduleExportFilename('', new Date('2026-06-15T12:00:00.000Z'), 'xlsx'),
    ).toBe('schedule-2026-06-15.xlsx');
  });

  it('builds a clear export success message with the filename and Downloads guidance', () => {
    expect(getExportSuccessMessage('brown-town-duplex-2026-06-15.xlsx', 'Excel')).toBe(
      'Excel export created: brown-town-duplex-2026-06-15.xlsx. Check your Downloads folder.',
    );
    expect(getExportSuccessMessage('brown-town-duplex-2026-06-15.csv', 'CSV')).toBe(
      'CSV export created: brown-town-duplex-2026-06-15.csv. Check your Downloads folder.',
    );
  });

  it('generates a formatted Excel workbook file', async () => {
    const buffer = await buildScheduleExcelBuffer({
      projectName: 'Brown Town Duplex',
      exportedAt: new Date('2026-06-15T12:00:00.000Z'),
      sections,
      tasks,
      people,
      dependencies,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const schedule = workbook.getWorksheet('Schedule');
    const peopleSheet = workbook.getWorksheet('People');
    const attention = workbook.getWorksheet('Attention');

    expect(schedule).toBeDefined();
    expect(peopleSheet).toBeDefined();
    expect(attention).toBeDefined();
    expect(schedule?.views[0]).toMatchObject({ state: 'frozen', ySplit: 5 });
    expect(schedule?.getColumn(1).width).toBeGreaterThan(12);
    expect(schedule?.getColumn(2).width).toBeGreaterThan(28);
    expect(schedule?.getColumn(9).width).toBeGreaterThan(32);
    expect(schedule?.getRow(1).height).toBe(24);
    expect(schedule?.getRow(5).font?.bold).toBe(true);
    expect(schedule?.autoFilter).toBe('A5:J5');
    expect(schedule?.getCell('A1').value).toBe('Project Schedule Export');
    expect(schedule?.getCell('B2').value).toBe('Brown Town Duplex');
    expect(schedule?.getCell('B7').value).toBe('Order tiles, grout and trims');
    expect(schedule?.getCell('I7').value).toBe('Pour slab finishes first + 2 days; auto-shift on; Confirm slab cure');
    expect(schedule?.getCell('A7').fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' },
    });
    expect(schedule?.getCell('D7').fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    });
    expect(peopleSheet?.getCell('A2').value).toBe('Alex Builder');
    expect(attention?.getCell('C2').value).toBe('Order tiles, grout and trims');
    expect(attention?.getCell('A2').fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF7ED' },
    });
  });
});
