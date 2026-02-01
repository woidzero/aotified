import { h } from "preact";
import render from "preact-render-to-string";

export function SectionHeading(options: SectionHeadingProps): string {
  return render(
    <div class="sectionHeading">
      <h2>{ options.text }</h2>
    </div>
  );
}
