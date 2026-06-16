"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { updateMyPortfolio, publishPortfolio, unpublishPortfolio } from "@/lib/rust-api"

export async function savePortfolioChanges(
  mdxContent: string,
  themeConfig: Record<string, unknown>
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Not authenticated")
  await updateMyPortfolio(mdxContent, themeConfig)
  revalidatePath("/dashboard/preview")
  revalidatePath("/dashboard")
}

export async function togglePortfolioPublished(publish: boolean): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Not authenticated")
  if (publish) {
    await publishPortfolio()
  } else {
    await unpublishPortfolio()
  }
  revalidatePath("/dashboard/preview")
  revalidatePath("/dashboard")
}
