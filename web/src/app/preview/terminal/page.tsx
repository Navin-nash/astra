import { TerminalTemplate } from "@/components/portfolio/templates/terminal"
import { MOCK_DATA } from "../mock-data"

export default function TerminalPreview() {
  return <TerminalTemplate data={{ ...MOCK_DATA, theme_config: { template: "terminal" } }} />
}
