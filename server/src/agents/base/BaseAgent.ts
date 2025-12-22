// Base class for all agents
import { AgentResult, AgentContext, CostLineItem, VisitedSiteLog, ExplanationEvent } from '../types';
import { pool } from '../../config/database';
import { EventEmitter } from 'events';

export abstract class BaseAgent {
  protected context: AgentContext;
  protected eventEmitter: EventEmitter;

  constructor(context: AgentContext, eventEmitter: EventEmitter) {
    this.context = context;
    this.eventEmitter = eventEmitter;
  }

  abstract execute(): Promise<AgentResult>;

  protected async recordCost(item: Omit<CostLineItem, 'currency' | 'timestamp'>): Promise<void> {
    try {
      // For now, we'll use SQL directly since Prisma schema may not be set up
      // TODO: Replace with Prisma once schema is migrated
      await pool.query(
        `INSERT INTO cost_line_items (job_id, entity_id, category, description, unit_cost, quantity, total_cost, currency, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          this.context.jobId,
          this.context.currentEntityId || null,
          item.category,
          item.description,
          item.unitCost,
          item.quantity,
          item.totalCost,
          'USD',
          new Date(),
        ]
      );

      // Update job total cost
      await pool.query(
        `UPDATE jobs SET total_cost = total_cost + $1 WHERE id = $2`,
        [item.totalCost, this.context.jobId]
      );
    } catch (error) {
      console.error('[BaseAgent] Failed to record cost:', error);
    }
  }

  protected async recordVisitedSite(item: Omit<VisitedSiteLog, 'startedAt'> & { startedAt?: Date }): Promise<void> {
    try {
      // TODO: Replace with Prisma once schema is migrated
      await pool.query(
        `INSERT INTO visited_site_logs (job_id, entity_id, url, started_at, completed_at, success, error, robots_txt_respected)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.context.jobId,
          this.context.currentEntityId || null,
          item.url,
          item.startedAt || new Date(),
          item.completedAt || null,
          item.success,
          item.error || null,
          item.robotsTxtRespected,
        ]
      );
    } catch (error) {
      console.error('[BaseAgent] Failed to record visited site:', error);
    }
  }

  protected emitEvent(event: ExplanationEvent): void {
    this.eventEmitter.emit('explanation', event);
  }
}

