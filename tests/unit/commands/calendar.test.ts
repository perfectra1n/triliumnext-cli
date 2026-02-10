import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

// Mock dependencies
vi.mock('../../../src/config.js', () => ({
  getClient: vi.fn(),
}));

vi.mock('../../../src/output.js', () => ({
  formatOutput: vi.fn(),
}));

vi.mock('../../../src/errors.js', () => ({
  handleError: vi.fn(),
}));

import { registerCalendarCommands } from '../../../src/commands/calendar.js';
import { getClient } from '../../../src/config.js';
import { formatOutput } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';

describe('calendar commands', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockYargs: any;
  let commandHandlers: Map<string, Function>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.mocked(getClient).mockReturnValue(mockClient as any);

    commandHandlers = new Map();
    mockYargs = {
      command: vi.fn((cmd: string, desc: string, builder: any, handler: Function) => {
        commandHandlers.set(cmd.split(' ')[0], handler);
        return mockYargs;
      }),
      demandCommand: vi.fn(() => mockYargs),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('inbox command', () => {
    it('registers inbox command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'inbox [date]',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets inbox for specified date', async () => {
      const inbox = { noteId: 'inbox-123', title: 'Inbox 2024-01-15' };
      mockClient.getInbox.mockResolvedValue(inbox);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('inbox')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(mockClient.getInbox).toHaveBeenCalledWith('2024-01-15');
      expect(formatOutput).toHaveBeenCalledWith('json', inbox);
    });

    it('uses today when date not provided', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const inbox = { noteId: 'inbox-today', title: 'Inbox Today' };
      mockClient.getInbox.mockResolvedValue(inbox);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('inbox')!;

      await handler({ format: 'json' });

      expect(mockClient.getInbox).toHaveBeenCalledWith(today);
    });

    it('handles errors', async () => {
      const error = new Error('Inbox not found');
      mockClient.getInbox.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('inbox')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('day command', () => {
    it('registers day command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'day <date>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets day note for specified date', async () => {
      const dayNote = { noteId: 'day-123', title: '2024-01-15' };
      mockClient.getDayNote.mockResolvedValue(dayNote);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('day')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(mockClient.getDayNote).toHaveBeenCalledWith('2024-01-15');
      expect(formatOutput).toHaveBeenCalledWith('json', dayNote);
    });

    it('handles errors', async () => {
      const error = new Error('Day note not found');
      mockClient.getDayNote.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('day')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('week-first-day command', () => {
    it('registers week-first-day command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'week-first-day <date>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets week first day note', async () => {
      const weekNote = { noteId: 'week-first-123', title: '2024-01-15' };
      mockClient.getWeekFirstDayNote.mockResolvedValue(weekNote);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('week-first-day')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(mockClient.getWeekFirstDayNote).toHaveBeenCalledWith('2024-01-15');
      expect(formatOutput).toHaveBeenCalledWith('json', weekNote);
    });

    it('handles errors', async () => {
      const error = new Error('Week note not found');
      mockClient.getWeekFirstDayNote.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('week-first-day')!;

      await handler({ date: '2024-01-15', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('week command', () => {
    it('registers week command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'week <week>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets week note', async () => {
      const weekNote = { noteId: 'week-123', title: 'Week 03, 2024' };
      mockClient.getWeekNote.mockResolvedValue(weekNote);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('week')!;

      await handler({ week: '2024-W03', format: 'json' });

      expect(mockClient.getWeekNote).toHaveBeenCalledWith('2024-W03');
      expect(formatOutput).toHaveBeenCalledWith('json', weekNote);
    });

    it('handles errors', async () => {
      const error = new Error('Week note not found');
      mockClient.getWeekNote.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('week')!;

      await handler({ week: '2024-W03', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('month command', () => {
    it('registers month command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'month <month>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets month note', async () => {
      const monthNote = { noteId: 'month-123', title: 'January 2024' };
      mockClient.getMonthNote.mockResolvedValue(monthNote);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('month')!;

      await handler({ month: '2024-01', format: 'json' });

      expect(mockClient.getMonthNote).toHaveBeenCalledWith('2024-01');
      expect(formatOutput).toHaveBeenCalledWith('json', monthNote);
    });

    it('handles errors', async () => {
      const error = new Error('Month note not found');
      mockClient.getMonthNote.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('month')!;

      await handler({ month: '2024-01', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('year command', () => {
    it('registers year command', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'year <year>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets year note', async () => {
      const yearNote = { noteId: 'year-123', title: '2024' };
      mockClient.getYearNote.mockResolvedValue(yearNote);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('year')!;

      await handler({ year: '2024', format: 'json' });

      expect(mockClient.getYearNote).toHaveBeenCalledWith('2024');
      expect(formatOutput).toHaveBeenCalledWith('json', yearNote);
    });

    it('handles errors', async () => {
      const error = new Error('Year note not found');
      mockClient.getYearNote.mockRejectedValue(error);

      registerCalendarCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('year')!;

      await handler({ year: '2024', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('command registration', () => {
    it('demands at least one subcommand', () => {
      registerCalendarCommands(mockYargs as unknown as Argv);

      expect(mockYargs.demandCommand).toHaveBeenCalledWith(
        1,
        expect.stringContaining('subcommand')
      );
    });
  });
});
