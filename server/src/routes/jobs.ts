// Jobs API Routes - Agent system job management
import express from 'express';
import { randomUUID } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = express.Router();

// Simple job queue service (placeholder - implement full JobQueueService if needed)
class SimpleJobQueue {
  async addJob(jobId: string, contractorRows: any[], preferences: any, createdBy: string) {
    // Create job in database
    const job = await prisma.job.create({
      data: {
        id: jobId,
        createdBy: createdBy,
        status: 'pending',
        preferences: preferences as any,
        contractorRows: {
          createMany: {
            data: contractorRows.map((row, index) => ({
              rocNumber: row.rocNumber || '',
              contractorName: row.contractorName || '',
              licenseStatus: row.licenseStatus,
              classification: row.classification,
              city: row.city,
              phone: row.phone,
              website: row.website,
              rowIndex: index,
            })),
          },
        },
      },
    });
    return { id: jobId };
  }

  async getJobStatus(jobId: string) {
    // First get the job with minimal data to check if it exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!job) {
      return null;
    }

    // Only fetch relations if job exists and is not in a terminal state
    // This prevents unnecessary queries for empty jobs
    return await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        contractorRows: true,
        entities: {
          include: {
            emailCandidates: {
              include: {
                evidence: {
                  take: 10, // Limit evidence to prevent excessive data
                },
              },
            },
            evidence: {
              take: 10, // Limit evidence to prevent excessive data
            },
          },
        },
        visitedSites: {
          take: 100, // Limit visited sites
        },
        costLineItems: {
          take: 100, // Limit cost items
        },
      },
    });
  }

  getEventEmitter(jobId: string) {
    // Return a simple event emitter (placeholder)
    const EventEmitter = require('events');
    return new EventEmitter();
  }
}

const jobQueue = new SimpleJobQueue();

// Helper function to transform job data
function transformJobData(job: any) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    totalCost: job.totalCost,
    preferences: job.preferences,
    contractorRows: job.contractorRows.map((row: any) => ({
      id: row.id,
      rocNumber: row.rocNumber,
      contractorName: row.contractorName,
      licenseStatus: row.licenseStatus,
      classification: row.classification,
      city: row.city,
      phone: row.phone,
      website: row.website,
      rowIndex: row.rowIndex,
      processed: row.processed,
    })),
    entities: job.entities.map((entity: any) => ({
      id: entity.id,
      contractorInputRowId: entity.contractorInputRowId,
      rocNumber: entity.rocNumber,
      contractorName: entity.contractorName,
      businessName: entity.businessName,
      officialWebsite: entity.officialWebsite,
      address: entity.address,
      phone: entity.phone,
      classification: entity.classification,
      licenseStatus: entity.licenseStatus,
      emailCandidates: entity.emailCandidates.map((candidate: any) => ({
        id: candidate.id,
        email: candidate.email,
        source: candidate.source,
        sourceUrl: candidate.sourceUrl,
        confidence: candidate.confidence,
        rationale: candidate.rationale,
        validationSignals: candidate.validationSignals,
        evidence: candidate.evidence || [],
      })),
    })),
    visitedSites: job.visitedSites || [],
    costLineItems: job.costLineItems || [],
    processedCount: job.contractorRows.filter((row: any) => row.processed).length,
  };
}

// Upload contractor data and create job
router.post('/upload', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contractorRows, preferences } = req.body;

    if (!contractorRows || !Array.isArray(contractorRows) || contractorRows.length === 0) {
      return res.status(400).json({ error: 'contractorRows is required and must be a non-empty array' });
    }

    // Generate job ID as UUID (required by Prisma schema)
    const jobId = randomUUID();

    // Transform contractor rows to match ContractorInput interface
    const transformedRows = contractorRows.map((row: any, index: number) => ({
      id: `row-${index}`,
      rocNumber: row.rocNumber || row.roc_number || '',
      contractorName: row.contractorName || row.contractor_name || row.name || '',
      licenseStatus: row.licenseStatus || row.license_status,
      classification: row.classification,
      city: row.city,
      phone: row.phone,
      website: row.website,
      rowIndex: index,
    }));

    // Add job to queue
    const bullMQJob = await jobQueue.addJob(
      jobId,
      transformedRows,
      preferences || { useLLM: true, excludedDomains: [] },
      req.user!.id
    );

    res.json({
      success: true,
      jobId: jobId,
      id: jobId,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('[Jobs API] Error creating job:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create job',
    });
  }
});

// Get job status and results
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const job = await jobQueue.getJobStatus(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check authorization
    if (job.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Cache the job data
    jobStatusCache.set(id, { data: job, timestamp: Date.now() });

    // Transform job data for frontend
    const transformedJob = transformJobData(job);

    res.json(transformedJob);
  } catch (error) {
    console.error('[Jobs API] Error getting job:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get job',
    });
  }
});

// Get job explanation feed (SSE)
router.get('/:id/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: { createdBy: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const eventEmitter = jobQueue.getEventEmitter(id);

    const onExplanation = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    eventEmitter.on('explanation', onExplanation);

    req.on('close', () => {
      eventEmitter.removeListener('explanation', onExplanation);
      console.log(`SSE connection closed for job ${id}`);
    });
  } catch (error) {
    console.error('[Jobs API] SSE feed error:', error);
    res.status(500).json({ error: 'Failed to establish SSE feed' });
  }
});

// Export job results
router.get('/:id/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const job = await jobQueue.getJobStatus(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Transform job data to CSV format
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Contractor Name,Email,ROC License,Phone,Business Name,Address,Website,Classification,License Status,Confidence,Sources');

    // Data rows
    job.entities.forEach((entity: any) => {
      if (entity.emailCandidates && entity.emailCandidates.length > 0) {
        entity.emailCandidates.forEach((candidate: any) => {
          csvRows.push([
            entity.contractorName || '',
            candidate.email || '',
            entity.rocNumber || '',
            entity.phone || '',
            entity.businessName || '',
            entity.address || '',
            entity.officialWebsite || '',
            entity.classification || '',
            entity.licenseStatus || '',
            candidate.confidence || 0,
            (candidate.evidence || []).map((e: any) => e.source).join(';'),
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });
      } else {
        // No email found, but still include contractor info
        csvRows.push([
          entity.contractorName || '',
          'Not Found',
          entity.rocNumber || '',
          entity.phone || '',
          entity.businessName || '',
          entity.address || '',
          entity.officialWebsite || '',
          entity.classification || '',
          entity.licenseStatus || '',
          0,
          '',
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      }
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="job-${id}-results.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('[Jobs API] Error exporting job:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to export job',
    });
  }
});

export default router;

