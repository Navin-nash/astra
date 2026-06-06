import { MinimalTemplate } from "@/components/portfolio/templates/minimal"
import { MOCK_DATA } from "../mock-data"

export default function MinimalPreview() {
  return <MinimalTemplate data={{ ...MOCK_DATA, theme_config: { template: "minimal" } }} />
}
