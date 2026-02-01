import { h } from "preact";
import render from "preact-render-to-string";

export function Review(options: OverlayProps): string {
    return render(
        <div class="content" id={options.id}>
            <header>
                <div class="close">
                    <button class="overlayClose">
                        <i class="far fa-times-circle"></i>
                    </button>
                </div>

                <div class="heading">
                    {options.heading.icon && (
                        <i class={"fas fa-" + options.heading.icon}></i>
                    )}
                    <span>{options.heading.label}</span>
                </div>
            </header>
        </div>
    );
}
