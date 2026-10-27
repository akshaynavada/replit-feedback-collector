import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import {
  CreateFeedbackBody,
  CreateFeedbackResponse,
  GetFeedbackSummaryResponse,
  ListFeedbackQueryParams,
  ListFeedbackResponse,
} from "@workspace/api-zod";
import { db, feedbackTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/feedback", async (req, res): Promise<void> => {
  const query = ListFeedbackQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const entries = await db
    .select()
    .from(feedbackTable)
    .orderBy(desc(feedbackTable.createdAt))
    .limit(query.data.limit)
    .offset(query.data.offset);

  res.json(ListFeedbackResponse.parse(entries));
});

router.post("/feedback", async (req, res): Promise<void> => {
  const body = CreateFeedbackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .insert(feedbackTable)
    .values({
      score: body.data.score,
      comment: body.data.comment?.trim() || null,
    })
    .returning();

  res.status(201).json(CreateFeedbackResponse.parse(entry));
});

router.get("/feedback/summary", async (_req, res): Promise<void> => {
  const [result] = await db
    .select({
      total: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(round(avg(${feedbackTable.score})::numeric, 1), 0)::float`,
      promoters: sql<number>`count(*) filter (where ${feedbackTable.score} >= 9)::int`,
      passives: sql<number>`count(*) filter (where ${feedbackTable.score} >= 7 and ${feedbackTable.score} <= 8)::int`,
      detractors: sql<number>`count(*) filter (where ${feedbackTable.score} <= 6)::int`,
      recentCount: sql<number>`count(*) filter (where ${feedbackTable.createdAt} >= now() - interval '30 days')::int`,
      previousCount: sql<number>`count(*) filter (where ${feedbackTable.createdAt} >= now() - interval '60 days' and ${feedbackTable.createdAt} < now() - interval '30 days')::int`,
    })
    .from(feedbackTable);

  const total = Number(result?.total ?? 0);
  const promoters = Number(result?.promoters ?? 0);
  const passives = Number(result?.passives ?? 0);
  const detractors = Number(result?.detractors ?? 0);
  const summary = {
    total,
    average: Number(result?.average ?? 0),
    nps: total === 0 ? 0 : Math.round(((promoters - detractors) / total) * 100),
    promoters,
    passives,
    detractors,
    recentCount: Number(result?.recentCount ?? 0),
    previousCount: Number(result?.previousCount ?? 0),
  };

  res.json(GetFeedbackSummaryResponse.parse(summary));
});

router.get("/feedback/export", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(feedbackTable)
    .orderBy(desc(feedbackTable.createdAt));

  const csvCell = (value: string | number | Date | null): string => {
    const text = value instanceof Date ? value.toISOString() : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [
    ["id", "score", "comment", "createdAt"].map(csvCell).join(","),
    ...entries.map((entry) =>
      [
        entry.id,
        entry.score,
        entry.comment,
        entry.createdAt,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  res
    .status(200)
    .type("text/csv")
    .attachment("feedback-export.csv")
    .send(rows.join("\r\n"));
});

export default router;
