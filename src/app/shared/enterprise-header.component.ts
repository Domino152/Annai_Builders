import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {
  IonHeader,
  IonToolbar,
} from "@ionic/angular/standalone";

@Component({
  selector: "agb-enterprise-header",
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar],
  template: `
    <ion-header class="enterprise-header" [class.client-header]="dark">
      <ion-toolbar>
        <div class="enterprise-toolbar">
          <div class="toolbar-context">
            <span>{{ eyebrow }}</span>
            <strong>{{ title }}</strong>
          </div>

          <div class="toolbar-search">
            <input [placeholder]="searchPlaceholder" />
          </div>

          <div class="toolbar-meta">
            <span>{{ metaLabel }}</span>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseHeaderComponent {
  @Input() title = "Dashboard";
  @Input() eyebrow = "Annai Golden Builders";
  @Input() metaLabel = "Live workspace";
  @Input() role = "Admin";
  @Input() dark = false;
  @Input() showLogo = false;
  @Input() showTitle = true;
  @Input() showMenu = false;
  @Input() searchPlaceholder = "Search clients, projects, vendors...";

  readonly logoPath = "assets/logo.png";
}
