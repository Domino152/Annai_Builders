import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { IonContent, IonSplitPane } from "@ionic/angular/standalone";
import { ErpDataService } from "../data/erp-data.service";
import { EnterpriseHeaderComponent } from "../shared/enterprise-header.component";
import { EnterpriseSidebarComponent } from "../shared/enterprise-sidebar.component";

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonSplitPane, EnterpriseHeaderComponent, EnterpriseSidebarComponent],
  template: `
    <ion-split-pane contentId="main-content" when="lg">
      <agb-enterprise-sidebar active="settings"></agb-enterprise-sidebar>

      <div class="ion-page" id="main-content">
        <agb-enterprise-header title="Settings" eyebrow="Administration" metaLabel="System preferences" [showTitle]="false" searchPlaceholder="Search settings..." />

        <ion-content class="erp-page">
          <main class="workspace-shell settings-shell">
            <section class="settings-hero">
              <div>
                <span>System settings</span>
                <h1>Company Preferences</h1>
                <p>Configure the defaults that shape client projects, approval flows, exports, and workspace access.</p>
              </div>
              <div class="settings-status">
                <strong>Active</strong>
                <span>Last updated today</span>
              </div>
            </section>

            <section class="settings-grid">
              <article class="settings-card">
                <div>
                  <span>Company</span>
                  <h2>Business Profile</h2>
                  <p>Used in project records, exports, and receipts.</p>
                </div>
                <label>
                  <span>Company Name</span>
                  <input value="Annai Golden Builders" />
                </label>
                <label>
                  <span>Primary Location</span>
                  <input value="Chennai, Tamil Nadu" />
                </label>
                <label>
                  <span>Default Supervisor</span>
                  <input value="R. Karthik" />
                </label>
              </article>

              <article class="settings-card">
                <div>
                  <span>Projects</span>
                  <h2>Project Defaults</h2>
                  <p>Applied when a client is created or a new project is opened.</p>
                </div>
                <label>
                  <span>Default Site Name</span>
                  <input value="Main Site" />
                </label>
                <label>
                  <span>Default Project Status</span>
                  <select>
                    <option>Active</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                  </select>
                </label>
                <div class="settings-toggle">
                  <div>
                    <strong>Auto-create project</strong>
                    <span>Create a starter project when a new client is saved.</span>
                  </div>
                  <input type="checkbox" checked />
                </div>
              </article>

              <article class="settings-card settings-site-profile">
                <div>
                  <span>Profile</span>
                  <h2>Site Directory</h2>
                  <p>Reusable site names for project forms, labour entries, and site expense filters.</p>
                </div>
                <div class="settings-site-chips" aria-label="Saved site names">
                  <span class="settings-site-chip" *ngFor="let site of profileSites()">
                    {{ site }}
                    <button type="button" aria-label="Remove site" (click)="removeProfileSite(site)">
                      <svg viewBox="0 0 20 20" aria-hidden="true" class="svg-icon">
                        <path d="m5.5 5.5 9 9" />
                        <path d="m14.5 5.5-9 9" />
                      </svg>
                    </button>
                  </span>
                </div>
                <label>
                  <span>Add Site</span>
                  <input
                    list="profile-site-options"
                    [value]="siteDraft()"
                    (input)="siteDraft.set($any($event.target).value)"
                    (keydown.enter)="addProfileSite($event)"
                    placeholder="Type or choose a site"
                  />
                  <datalist id="profile-site-options">
                    <option *ngFor="let site of allKnownSites()" [value]="site"></option>
                  </datalist>
                </label>
                <button type="button" class="settings-inline-action" (click)="addProfileSite()">Add site</button>
              </article>

              <article class="settings-card">
                <div>
                  <span>Approvals</span>
                  <h2>Workflow Rules</h2>
                  <p>Keep financial and site records controlled before export.</p>
                </div>
                <div class="settings-toggle">
                  <div>
                    <strong>Require expense approval</strong>
                    <span>Site and general expenses need admin review.</span>
                  </div>
                  <input type="checkbox" checked />
                </div>
                <div class="settings-toggle">
                  <div>
                    <strong>Payment verification</strong>
                    <span>Collections require accountant confirmation.</span>
                  </div>
                  <input type="checkbox" checked />
                </div>
                <div class="settings-toggle">
                  <div>
                    <strong>Material purchase tracking</strong>
                    <span>Track vendors, PO numbers, and remaining stock.</span>
                  </div>
                  <input type="checkbox" checked />
                </div>
              </article>

              <article class="settings-card">
                <div>
                  <span>Exports</span>
                  <h2>Report Preferences</h2>
                  <p>Control file naming and export defaults.</p>
                </div>
                <label>
                  <span>Default Export Format</span>
                  <select>
                    <option>Excel</option>
                    <option>PDF</option>
                  </select>
                </label>
                <label>
                  <span>Export Prefix</span>
                  <input value="AGB" />
                </label>
                <div class="settings-toggle">
                  <div>
                    <strong>Include project ID</strong>
                    <span>Append project IDs to exported records.</span>
                  </div>
                  <input type="checkbox" checked />
                </div>
              </article>
            </section>
          </main>
        </ion-content>
      </div>
    </ion-split-pane>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly data = inject(ErpDataService);

  readonly profileSites = signal(this.allKnownSites());
  readonly siteDraft = signal("");

  allKnownSites(): string[] {
    return [...new Set(this.data.projects().flatMap((project) => project.sites).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  addProfileSite(event?: Event) {
    event?.preventDefault();
    const site = this.siteDraft().trim();
    if (!site) return;
    this.profileSites.update((sites) => (sites.some((value) => value.toLowerCase() === site.toLowerCase()) ? sites : [...sites, site].sort((a, b) => a.localeCompare(b))));
    this.siteDraft.set("");
  }

  removeProfileSite(site: string) {
    this.profileSites.update((sites) => sites.filter((value) => value !== site));
  }
}
