import { VoidTemplate } from "@/components/portfolio/templates/void"
import { ML_MOCK_DATA } from "../mock-data"

export default function VoidPreview() {
  return <VoidTemplate data={{ ...ML_MOCK_DATA, theme_config: { template: "void" } }} />
}
