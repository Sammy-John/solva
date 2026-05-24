import type { Dependency, Person, Section, Task } from '@/types/scheduling';
import type ExcelJS from 'exceljs';

export interface ScheduleExportInput {
  projectName?: string;
  exportedAt?: Date;
  sections: Section[];
  tasks: Task[];
  people: Person[];
  dependencies: Dependency[];
}

export interface WorkbookSheet {
  name: string;
  rows: string[][];
}

export interface ScheduleExportWorkbook {
  fileName: string;
  sheets: WorkbookSheet[];
}

const scheduleHeaders = [
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
];

const peopleHeaders = [
  'Name',
  'Group',
  'Company',
  'Trade / role',
  'Phone',
  'Email',
  'Notes',
];

const attentionHeaders = [
  'Status',
  'Section',
  'Task',
  'Start date',
  'End date',
  'Assigned',
  'Waiting On',
];

const formatDateStamp = (date: Date): string => date.toISOString().slice(0, 10);

export const getScheduleExportFilename = (
  projectName: string | undefined,
  exportedAt: Date,
  extension: 'csv' | 'xlsx',
): string => {
  const base = (projectName || 'schedule')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'schedule'}-${formatDateStamp(exportedAt)}.${extension}`;
};

export const getExportSuccessMessage = (
  filename: string,
  format: 'CSV' | 'Excel',
): string => `${format} export created: ${filename}. Check your Downloads folder.`;

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const sortSections = (sections: Section[]): Section[] =>
  [...sections].sort((a, b) => a.order - b.order);

const getPeopleById = (people: Person[]): Map<string, Person> =>
  new Map(people.map((person) => [person.id, person]));

const getTasksById = (tasks: Task[]): Map<string, Task> =>
  new Map(tasks.map((task) => [task.id, task]));

const formatAssigned = (task: Task, peopleById: Map<string, Person>): string =>
  task.assignedTo.map((id) => peopleById.get(id)?.name ?? id).join('; ');

const formatDependency = (
  dependency: Dependency,
  tasksById: Map<string, Task>,
): string => {
  const predecessorName = tasksById.get(dependency.predecessorId)?.name ?? dependency.predecessorId;
  const parts = [`${predecessorName} finishes first`];

  if (dependency.lagDays > 0) {
    parts[0] = `${parts[0]} + ${dependency.lagDays} day${dependency.lagDays === 1 ? '' : 's'}`;
  }

  parts.push(dependency.autoShift ? 'auto-shift on' : 'auto-shift off');

  if (dependency.notes) {
    parts.push(dependency.notes);
  }

  return parts.join('; ');
};

const formatWaitingOn = (
  task: Task,
  dependencies: Dependency[],
  tasksById: Map<string, Task>,
): string =>
  dependencies
    .filter((dependency) => dependency.successorId === task.id)
    .map((dependency) => formatDependency(dependency, tasksById))
    .join(' | ');

const buildScheduleRows = ({
  sections,
  tasks,
  people,
  dependencies,
}: ScheduleExportInput): string[][] => {
  const peopleById = getPeopleById(people);
  const tasksById = getTasksById(tasks);
  const rows: string[][] = [];

  for (const section of sortSections(sections)) {
    const sectionTasks = tasks.filter((task) => task.sectionId === section.id);

    for (const task of sectionTasks) {
      rows.push([
        section.name,
        task.name,
        task.taskType,
        task.status,
        task.startDate || '',
        task.endDate || '',
        String(task.duration ?? 0),
        formatAssigned(task, peopleById),
        formatWaitingOn(task, dependencies, tasksById),
        task.comments.join(' | '),
      ]);
    }
  }

  return rows;
};

const buildPeopleRows = (people: Person[]): string[][] =>
  [...people]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((person) => [
      person.name,
      person.userGroup,
      person.company ?? '',
      person.trade ?? '',
      person.phone ?? '',
      person.email ?? '',
      person.notes ?? '',
    ]);

const buildAttentionRows = (
  scheduleRows: string[][],
): string[][] =>
  scheduleRows
    .filter((row) => {
      const status = row[3];
      const taskType = row[2];
      const waitingOn = row[8];
      return status === 'Delayed' || status === 'Due for Review' || taskType === 'Inspection' || Boolean(waitingOn);
    })
    .map((row) => [
      row[3],
      row[0],
      row[1],
      row[4],
      row[5],
      row[7],
      row[8],
    ]);

export const buildScheduleCsv = (input: ScheduleExportInput): string => {
  const rows = [scheduleHeaders, ...buildScheduleRows(input)];
  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\r\n');
};

export const buildScheduleExportWorkbook = (
  input: ScheduleExportInput,
): ScheduleExportWorkbook => {
  const exportedAt = input.exportedAt ?? new Date();
  const projectName = input.projectName || 'Schedule';
  const scheduleRows = buildScheduleRows(input);

  return {
    fileName: getScheduleExportFilename(projectName, exportedAt, 'xlsx'),
    sheets: [
      {
        name: 'Schedule',
        rows: [
          ['Project Schedule Export'],
          ['Project', projectName],
          ['Export date', formatDateStamp(exportedAt)],
          [],
          scheduleHeaders,
          ...scheduleRows,
        ],
      },
      {
        name: 'People',
        rows: [peopleHeaders, ...buildPeopleRows(input.people)],
      },
      {
        name: 'Attention',
        rows: [attentionHeaders, ...buildAttentionRows(scheduleRows)],
      },
    ],
  };
};

const applyWorksheetFormatting = (worksheet: ExcelJS.Worksheet): void => {
  const isSchedule = worksheet.name === 'Schedule';
  const headerRowNumber = isSchedule ? 5 : 1;

  worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

  if (isSchedule) {
    worksheet.mergeCells('A1:J1');
    worksheet.getRow(1).height = 24;
    worksheet.getCell('A1').font = {
      bold: true,
      size: 16,
      color: { argb: 'FF23423B' },
    };
    worksheet.getCell('A1').alignment = { vertical: 'middle' };
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: 10 },
    };
  }

  worksheet.eachRow((row, rowNumber) => {
    const isHeaderRow = rowNumber === headerRowNumber;

    if (isHeaderRow) {
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF23423B' },
      };
    }

    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    if (isSchedule && rowNumber > headerRowNumber && rowNumber % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      });
    }
  });

  if (isSchedule) {
    worksheet.getColumn(1).width = 18;
    worksheet.getColumn(2).width = 34;
    worksheet.getColumn(3).width = 14;
    worksheet.getColumn(4).width = 16;
    worksheet.getColumn(5).width = 14;
    worksheet.getColumn(6).width = 14;
    worksheet.getColumn(7).width = 10;
    worksheet.getColumn(8).width = 24;
    worksheet.getColumn(9).width = 38;
    worksheet.getColumn(10).width = 40;
  } else {
    worksheet.columns.forEach((column) => {
      let maxLength = 10;

      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const value = cell.value == null ? '' : String(cell.value);
        maxLength = Math.max(maxLength, value.length);
      });

      column.width = Math.min(Math.max(maxLength + 2, 12), 42);
    });
  }

  if (isSchedule) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;

      const statusCell = row.getCell(4);
      const status = String(statusCell.value ?? '');
      const fillByStatus: Record<string, string> = {
        Delayed: 'FFFEE2E2',
        'Due for Review': 'FFFFF7ED',
        Booked: 'FFDBEAFE',
        Completed: 'FFDCFCE7',
        'In Progress': 'FFE0E7FF',
      };
      const fillColor = fillByStatus[status];

      if (fillColor) {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
      }
    });
  }

  if (worksheet.name === 'Attention') {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF7ED' },
        };
      });
    });
  }
};

export const buildScheduleExcelBuffer = async (
  input: ScheduleExportInput,
): Promise<ArrayBuffer> => {
  const { default: ExcelJS } = await import('exceljs');
  const exportWorkbook = buildScheduleExportWorkbook(input);
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Solva Construction Planner';
  workbook.created = input.exportedAt ?? new Date();
  workbook.modified = input.exportedAt ?? new Date();

  for (const sheet of exportWorkbook.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRows(sheet.rows);
    applyWorksheetFormatting(worksheet);
  }

  return workbook.xlsx.writeBuffer();
};
