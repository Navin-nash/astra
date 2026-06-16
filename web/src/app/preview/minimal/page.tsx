import { MinimalTemplate } from "@/components/portfolio/templates/minimal"
import { FULLSTACK_MOCK_DATA } from "../mock-data"

export default function MinimalPreview() {
  return <MinimalTemplate data={{ ...FULLSTACK_MOCK_DATA, theme_config: { template: "minimal" } }} />
}
