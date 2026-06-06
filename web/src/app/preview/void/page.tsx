import { VoidTemplate } from "@/components/portfolio/templates/void"
import { MOCK_DATA } from "../mock-data"

export default function VoidPreview() {
  return <VoidTemplate data={{ ...MOCK_DATA, theme_config: { template: "void" } }} />
}
