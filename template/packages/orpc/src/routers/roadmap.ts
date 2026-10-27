import { z } from "zod"
import { fetchRoadmap } from "../lib/roadmap"
import { publicProcedure } from "../procedures"

export const roadmapRouter = {
  list: publicProcedure
    .route({ method: "GET", path: "/public/roadmap", summary: "Roadmap from the repo's milestones", tags: ["public"] })
    .output(
      z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          url: z.string(),
          state: z.enum(["open", "closed"]),
          open: z.number(),
          closed: z.number(),
          progress: z.number(),
          dueOn: z.string().nullable(),
        }),
      ),
    )
    .handler(({ context }) => fetchRoadmap(context.config.githubRepo, context.config.githubToken)),
}
