import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { IonContent, IonIcon } from "@ionic/angular/standalone";
import type { ExpenseRow, LabourRow, MaterialRow, PaymentRow, Project } from "../../data/dashboardData";
import { ErpDataService, type Client, type Subcontractor, type Supervisor, type Vendor } from "../data/erp-data.service";
import { formatMoney, formatNumber, statusClass } from "../shared/format";

type NavKey = "dashboard" | "clients" | "materials" | "vendors" | "subcontract" | "labours" | "supervisors" | "expenses" | "payments" | "reports" | "settings";
type ExpenseMode = "site" | "general";
type ClientSection = "materials" | "labours" | "vendors" | "subcontract" | "supervisors" | "siteExpense" | "reports";
type ClientSite = { key: string; projectId: string; projectName: string; site: string; status: Project["status"]; completion: number; startDate: string };
type EditableModule = "clients" | "materials" | "vendors" | "subcontract" | "labours" | "supervisors" | "expenses" | "payments";
type FormMode = "add" | "edit";
type FormField = { key: string; label: string; type?: "text" | "number" | "date" };
type SiteExpenseGroup = {
  key: string;
  projectId: string;
  projectName: string;
  site: string;
  supervisor: string;
  spent: number;
  received: number;
  balance: number;
  rows: ExpenseRow[];
};

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  template: `
    <div class="ion-page erp-shell-host">
      <ion-content class="erp-shell-page">
        <main class="erp-split-shell">
        <aside class="erp-side-nav" aria-label="ERP navigation">
          <div class="brand-panel">
            <img src="assets/logo.png" alt="Annai Builders" />
            <div>
              <span>Annai Builders</span>
              <strong>ERP Control</strong>
            </div>
          </div>

          <div class="side-section-label">Main Modules</div>
          <nav>
            <button *ngFor="let item of navItems" type="button" [class.active]="activeNav() === item.key" (click)="selectNav(item.key)">
              <span class="nav-icon-badge" [class.logo-badge]="item.logo"><ion-icon [name]="item.icon"></ion-icon></span>
              <span>{{ item.label }}</span>
              <small>{{ navCount(item.key) }}</small>
            </button>
          </nav>

        </aside>

        <section class="erp-detail-panel">
          <header class="erp-detail-header">
            <div>
              <span>{{ activeEyebrow() }}</span>
              <h1>{{ activeTitle() }}</h1>
              <p>{{ activeDescription() }}</p>
            </div>
            <div class="admin-toolbar" aria-label="Admin workspace tools">
              <button *ngIf="activeAddModule()" type="button" class="icon-action add-action" (click)="openAddForm()">
                <ion-icon name="add-outline"></ion-icon>
                <span>Add</span>
              </button>
              <div class="admin-user-chip" aria-label="Current role">
                <span>Admin</span>
                <strong>Full Access</strong>
              </div>
              <label class="erp-search">
                <ion-icon name="search-outline"></ion-icon>
                <span class="sr-only">Search selected ERP records</span>
                <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" placeholder="Search selected records" />
              </label>
              <label class="erp-filter">
                <span class="sr-only">Filter selected ERP records</span>
                <select [value]="statusFilter()" (change)="setStatusFilter($any($event.target).value)">
                  <option value="all">All records</option>
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="on hold">On Hold</option>
                  <option value="part paid">Part Paid</option>
                  <option value="paid">Paid</option>
                  <option value="not started">Not Started</option>
                  <option value="within balance">Within Balance</option>
                  <option value="low balance">Low Balance</option>
                  <option value="overspent">Overspent</option>
                </select>
              </label>
              <label *ngIf="activeNav() === 'labours' || activeClientSection() === 'labours'" class="erp-filter">
                <span class="sr-only">Filter labour category</span>
                <select [value]="labourCategoryFilter()" (change)="setLabourCategoryFilter($any($event.target).value)">
                  <option value="all">All Labour</option>
                  <option *ngFor="let category of labourCategories()" [value]="category.toLowerCase()">{{ category }}</option>
                </select>
              </label>
            </div>
          </header>

          <section *ngIf="!(activeNav() === 'clients' && selectedClient())" class="module-overview" aria-label="Current module summary">
            <div *ngFor="let item of summaryStats()">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </section>

          <ng-container [ngSwitch]="activeNav()">
            <section *ngSwitchCase="'dashboard'" class="module-stack">
              <div class="metric-grid">
                <article><ion-icon name="briefcase-outline"></ion-icon><span>Total Project Value</span><strong>{{ formatMoney(totalProjectValue()) }}</strong><small>{{ data.projects().length }} projects</small></article>
                <article><ion-icon name="card-outline"></ion-icon><span>Payments Received</span><strong>{{ formatMoney(totalReceived()) }}</strong><small>{{ collectionRate() }} collected</small></article>
                <article><ion-icon name="trending-up-outline"></ion-icon><span>Pending Balance</span><strong>{{ formatMoney(totalPending()) }}</strong><small>Across active clients</small></article>
                <article><ion-icon name="receipt-outline"></ion-icon><span>Site Expenses</span><strong>{{ formatMoney(totalSiteExpense()) }}</strong><small>{{ siteExpenseGroups().length }} site ledgers</small></article>
              </div>

              <div class="dashboard-grid">
                <article class="wide-card">
                  <div class="section-title"><h2>Active Projects</h2><span>{{ activeProjects().length }} running</span></div>
                  <div class="project-list">
                    <button *ngFor="let project of activeProjects()" type="button" (click)="openProject(project)">
                      <div>
                        <strong>{{ project.name }}</strong>
                        <span>{{ project.client }} / {{ project.sites.length }} sites / Started {{ project.startDate }}</span>
                      </div>
                      <small>{{ project.completion }}%</small>
                    </button>
                  </div>
                </article>
                <article>
                  <div class="section-title"><h2>Approvals</h2><span>Quick view</span></div>
                  <dl class="compact-ledger">
                    <div><dt>Pending Materials</dt><dd>{{ pendingMaterials() }}</dd></div>
                    <div><dt>Pending Labour</dt><dd>{{ pendingLabour() }}</dd></div>
                    <div><dt>Pending Expenses</dt><dd>{{ pendingExpenses() }}</dd></div>
                  </dl>
                </article>
                <article class="daily-summary-card">
                  <div class="section-title"><h2>Daily Summary</h2><span>{{ todayLabel }}</span></div>
                  <dl class="compact-ledger">
                    <div><dt>Material Requests</dt><dd>{{ dailyMaterialRequests() }}</dd></div>
                    <div><dt>Payments</dt><dd>{{ formatMoney(dailyPaymentTotal()) }}</dd></div>
                    <div><dt>Labour Present</dt><dd>{{ dailyLabourPresent() }}</dd></div>
                    <div><dt>Site Expenses</dt><dd>{{ formatMoney(dailyExpenseTotal()) }}</dd></div>
                    <div><dt>Pending Actions</dt><dd>{{ pendingMaterials() + pendingLabour() + pendingExpenses() }}</dd></div>
                  </dl>
                </article>
              </div>
            </section>

            <section *ngSwitchCase="'clients'" class="module-stack">
              <ng-container *ngIf="selectedClient() as client; else clientCards">
                <article class="detail-card focused-detail-card" [class.site-workspace-page]="activeClientSite(client)">
                  <ng-container *ngIf="activeClientSite(client) as activeSite; else clientOverview">
                    <div class="section-title site-workspace-title">
                      <div>
                        <button type="button" class="back-action" (click)="activeClientSiteKey.set(null); activeClientSection.set(null)">
                          <ion-icon name="arrow-back-outline"></ion-icon>
                          Sites
                        </button>
                        <h2>{{ activeSite.site }}</h2>
                        <p>{{ client.name }} / {{ activeSite.projectName }} / Started {{ activeSite.startDate }}</p>
                      </div>
                      <span class="status-pill" [ngClass]="statusClass(activeSite.status)">{{ activeSite.status }} / {{ activeSite.completion }}%</span>
                    </div>

                    <nav class="client-upper-nav independent-nav" aria-label="Site detail sections">
                      <div class="nav-title">
                        <span>Site Modules</span>
                        <strong>{{ activeSite.site }}</strong>
                      </div>
                      <button
                        *ngFor="let section of clientSections"
                        type="button"
                        [class.active]="activeClientSection() === section.key"
                        (click)="activeClientSection.set(section.key)"
                      >
                        <ion-icon [name]="section.icon"></ion-icon>
                        <span>{{ section.label }}</span>
                        <ion-icon class="chevron" name="chevron-down-outline"></ion-icon>
                      </button>
                    </nav>

                    <div class="detail-metrics site-metrics">
                      <div><span>Materials</span><strong>{{ materialsForClientSite(client).length }}</strong></div>
                      <div><span>Labour Present</span><strong>{{ siteLabourPresent(client) }}</strong></div>
                      <div><span>Site Expense</span><strong>{{ formatMoney(siteExpenseTotal(client)) }}</strong></div>
                      <div><span>Vendors</span><strong>{{ vendorsForClientSite(client).length }}</strong></div>
                    </div>

                    <ng-container *ngIf="activeClientSection()" [ngSwitch]="activeClientSection()">
                      <section *ngSwitchCase="'materials'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Materials</h2><span>{{ filteredMaterialsForClientSite(client).length }} records</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let material of filteredMaterialsForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="cube-outline"></ion-icon><span>{{ material.status }}</span></div>
                          <h3>{{ material.name }}</h3>
                          <p>{{ projectName(material.projectId) }} / {{ material.site }}</p>
                          <dl>
                            <div><dt>Requested</dt><dd>{{ formatNumber(material.requested) }} {{ material.unit }}</dd></div>
                            <div><dt>Purchased</dt><dd>{{ formatNumber(material.purchased) }} {{ material.unit }}</dd></div>
                            <div><dt>Used</dt><dd>{{ formatNumber(material.consumed) }} {{ material.unit }}</dd></div>
                            <div><dt>Remaining</dt><dd>{{ formatNumber(material.purchased - material.consumed) }} {{ material.unit }}</dd></div>
                            <div><dt>Needed</dt><dd>{{ formatNumber(materialNeeded(material)) }} {{ material.unit }}</dd></div>
                            <div><dt>Purchased From</dt><dd>{{ material.vendor }}</dd></div>
                            <div><dt>PO</dt><dd>{{ material.poNumber }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'labours'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Labours</h2><span>{{ filteredLabourForClientSite(client).length }} records</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let row of filteredLabourForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="people-outline"></ion-icon><span>{{ row.status }}</span></div>
                          <h3>{{ row.party }}</h3>
                          <p>{{ projectName(row.projectId) }} / {{ row.site }}</p>
                          <dl>
                            <div><dt>Category</dt><dd>{{ row.category }}</dd></div>
                            <div><dt>Present Count</dt><dd>{{ row.presentCount }}</dd></div>
                            <div><dt>Present Days</dt><dd>{{ row.presentDays }}</dd></div>
                            <div><dt>Absent Days</dt><dd>{{ row.absentDays }}</dd></div>
                            <div><dt>Daily Wage</dt><dd>{{ formatMoney(row.dailyWage) }}</dd></div>
                            <div><dt>Weekly Pay</dt><dd>{{ formatMoney(labourWeeklyPay(row)) }}</dd></div>
                            <div><dt>Mode</dt><dd>{{ row.paymentMode }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'vendors'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Vendors and Supply</h2><span>{{ filteredVendorsForClientSite(client).length }} vendors</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let vendor of filteredVendorsForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="business-outline"></ion-icon><span>{{ vendor.materialType }}</span></div>
                          <h3>{{ vendor.name }}</h3>
                          <p>{{ vendor.phone }} / {{ vendor.address }}</p>
                          <dl>
                            <div><dt>GST</dt><dd>{{ vendor.gst }}</dd></div>
                            <div><dt>Supply Rows</dt><dd>{{ materialsForClientSiteVendor(client, vendor).length }}</dd></div>
                            <div><dt>Purchased</dt><dd>{{ clientSiteVendorPurchasedUnits(client, vendor) }}</dd></div>
                            <div><dt>Materials</dt><dd>{{ clientSiteVendorMaterialNames(client, vendor) }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'subcontract'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Subcontracts</h2><span>{{ filteredSubcontractorsForClientSite(client).length }} packages</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let row of filteredSubcontractorsForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="construct-outline"></ion-icon><span>{{ row.paymentStatus }}</span></div>
                          <h3>{{ row.name }}</h3>
                          <p>{{ projectName(row.projectId) }} / {{ row.site }}</p>
                          <dl>
                            <div><dt>Work</dt><dd>{{ row.workPackage }}</dd></div>
                            <div><dt>Contract</dt><dd>{{ formatMoney(row.contractValue) }}</dd></div>
                            <div><dt>Advance</dt><dd>{{ formatMoney(row.advancePaid) }}</dd></div>
                            <div><dt>Remaining</dt><dd>{{ formatMoney(row.contractValue - row.advancePaid) }}</dd></div>
                            <div><dt>Due</dt><dd>{{ row.dueDate }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'supervisors'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Supervisors</h2><span>{{ filteredSupervisorsForClientSite(client).length }} assigned</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let supervisor of filteredSupervisorsForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="id-card-outline"></ion-icon><span>{{ supervisor.status }}</span></div>
                          <h3>{{ supervisor.name }}</h3>
                          <p>{{ supervisor.role }}</p>
                          <dl>
                            <div><dt>Phone</dt><dd>{{ supervisor.phone }}</dd></div>
                            <div><dt>Project</dt><dd>{{ supervisor.assignedProject }}</dd></div>
                            <div><dt>Site</dt><dd>{{ supervisor.assignedSite }}</dd></div>
                            <div><dt>Cash Limit</dt><dd>{{ formatMoney(supervisor.cashLimit) }}</dd></div>
                            <div><dt>Available</dt><dd>{{ formatMoney(supervisor.cashLimit - supervisor.activeAdvances) }}</dd></div>
                            <div><dt>Authority</dt><dd>{{ supervisor.approvalAuthority }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'siteExpense'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Site Expenses</h2><span>{{ filteredSiteExpenseGroupsForClientSite(client).length }} site ledgers</span></div>
                      <div class="insight-card-grid">
                        <article *ngFor="let group of filteredSiteExpenseGroupsForClientSite(client)" class="insight-card">
                          <div class="card-top"><ion-icon name="receipt-outline"></ion-icon><span>{{ group.rows.length }} entries</span></div>
                          <h3>{{ group.site }}</h3>
                          <p>{{ group.projectName }} / {{ group.supervisor }}</p>
                          <dl>
                            <div><dt>Received</dt><dd>{{ formatMoney(group.received) }}</dd></div>
                            <div><dt>Spent</dt><dd>{{ formatMoney(group.spent) }}</dd></div>
                            <div><dt>Remaining</dt><dd>{{ formatMoney(group.balance) }}</dd></div>
                            <div><dt>Spend Ratio</dt><dd>{{ expenseSpendRatio(group) }}%</dd></div>
                            <div><dt>Risk</dt><dd>{{ expenseRisk(group) }}</dd></div>
                          </dl>
                        </article>
                      </div>
                      </section>

                      <section *ngSwitchCase="'reports'" class="module-detail-zone">
                      <div class="section-title compact"><h2>Client Reports</h2><span>Export-ready view</span></div>
                      <div class="table-wrap">
                        <table>
                          <thead><tr><th>Report</th><th>Scope</th><th>Key Detail</th><th>Owner</th><th>Status</th></tr></thead>
                          <tbody>
                            <tr *ngFor="let report of clientReports(client)">
                              <td>{{ report.name }}</td>
                              <td>{{ report.scope }}</td>
                              <td>{{ report.detail }}</td>
                              <td>{{ report.owner }}</td>
                              <td>{{ report.status }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      </section>
                    </ng-container>
                  </ng-container>

                  <ng-template #clientOverview>
                    <div class="section-title">
                      <div>
                        <button type="button" class="back-action" (click)="selectedClient.set(null)">
                          <ion-icon name="arrow-back-outline"></ion-icon>
                          Clients
                        </button>
                        <h2>{{ client.name }}</h2>
                        <p>{{ client.mobile }} / {{ client.address }}</p>
                      </div>
                      <span class="status-pill" [ngClass]="statusClass(client.status)">{{ client.status }}</span>
                    </div>

                    <div class="client-profile-strip">
                      <div class="avatar large">{{ client.initials }}</div>
                      <div><span>Assigned Supervisor</span><strong>{{ client.supervisor }}</strong></div>
                      <div><span>Projects</span><strong>{{ clientSummary(client).projectCount }}</strong></div>
                      <div><span>Active Sites</span><strong>{{ clientSummary(client).activeSites }}</strong></div>
                      <div><span>First Started</span><strong>{{ firstStartDate(client) }}</strong></div>
                    </div>

                    <div class="detail-metrics">
                      <div><span>Project Value</span><strong>{{ formatMoney(clientSummary(client).totalValue) }}</strong></div>
                      <div><span>Received</span><strong>{{ formatMoney(clientSummary(client).received) }}</strong></div>
                      <div><span>Pending</span><strong>{{ formatMoney(clientSummary(client).pending) }}</strong></div>
                      <div><span>Labour Count</span><strong>{{ clientSummary(client).activeLabour }}</strong></div>
                    </div>

                    <section class="client-site-workspace">
                      <div class="section-title compact">
                        <h2>Active Sites</h2>
                        <span>{{ sitesForClient(client).length }} site workspaces</span>
                      </div>
                      <div class="site-card-grid">
                        <button
                          *ngFor="let site of sitesForClient(client)"
                          type="button"
                          class="site-card"
                          (click)="openClientSite(site)"
                        >
                          <span>{{ site.projectName }}</span>
                          <strong>{{ site.site }}</strong>
                          <small>{{ site.status }} / {{ site.completion }}% / Started {{ site.startDate }}</small>
                        </button>
                      </div>
                    </section>
                  </ng-template>
                </article>
              </ng-container>

              <ng-template #clientCards>
                <div class="card-grid">
                  <article
                    *ngFor="let client of filteredClients()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open client details for ' + client.name"
                    (click)="selectClient(client)"
                    (keydown.enter)="selectClient(client)"
                    (keydown.space)="selectClient(client)"
                  >
                    <div class="card-top">
                      <div class="avatar">{{ client.initials }}</div>
                      <button type="button" class="edit-card-btn" (click)="openEditForm('clients', client, $event)" aria-label="Edit client"><ion-icon name="create-outline"></ion-icon></button>
                      <span class="status-pill" [ngClass]="statusClass(client.status)">{{ client.status }}</span>
                    </div>
                    <h2>{{ client.name }}</h2>
                    <p>{{ client.address }}</p>
                    <dl>
                      <div><dt>Client ID</dt><dd>{{ client.id }}</dd></div>
                      <div><dt>Sites</dt><dd>{{ clientSummary(client).activeSites }}</dd></div>
                      <div><dt>Started</dt><dd>{{ firstStartDate(client) }}</dd></div>
                      <div><dt>Supervisor</dt><dd>{{ client.supervisor }}</dd></div>
                      <div><dt>Pending</dt><dd>{{ formatMoney(clientSummary(client).pending) }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'materials'" class="module-stack">
              <ng-container *ngIf="selectedMaterial() as material; else materialCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedMaterial.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Materials
                      </button>
                      <h2>{{ material.name }}</h2>
                      <p>{{ projectName(material.projectId) }} / {{ material.site }} / {{ material.vendor }}</p>
                    </div>
                    <span class="status-pill" [ngClass]="statusClass(material.status)">{{ material.status }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Total Requested</span><strong>{{ formatNumber(materialTotal(material, 'requested')) }} {{ material.unit }}</strong></div>
                    <div><span>Total Purchased</span><strong>{{ formatNumber(materialTotal(material, 'purchased')) }} {{ material.unit }}</strong></div>
                    <div><span>Total Used</span><strong>{{ formatNumber(materialTotal(material, 'consumed')) }} {{ material.unit }}</strong></div>
                    <div><span>Total Needed</span><strong>{{ formatNumber(materialNeededTotal(material)) }} {{ material.unit }}</strong></div>
                  </div>
                  <section>
                    <div class="section-title compact"><h2>Site-wise Material Position</h2><span>{{ materialRowsFor(material).length }} site records</span></div>
                    <div class="insight-card-grid">
                      <article *ngFor="let row of materialRowsFor(material)" class="insight-card">
                        <div class="card-top"><ion-icon name="location-outline"></ion-icon><span>{{ row.status }}</span></div>
                        <h3>{{ row.site }}</h3>
                        <p>{{ projectName(row.projectId) }}</p>
                        <dl>
                          <div><dt>Requested</dt><dd>{{ formatNumber(row.requested) }} {{ row.unit }}</dd></div>
                          <div><dt>Purchased</dt><dd>{{ formatNumber(row.purchased) }} {{ row.unit }}</dd></div>
                          <div><dt>Used</dt><dd>{{ formatNumber(row.consumed) }} {{ row.unit }}</dd></div>
                          <div><dt>Remaining</dt><dd>{{ formatNumber(row.purchased - row.consumed) }} {{ row.unit }}</dd></div>
                          <div><dt>Needed</dt><dd>{{ formatNumber(materialNeeded(row)) }} {{ row.unit }}</dd></div>
                          <div><dt>Vendor</dt><dd>{{ row.vendor }}</dd></div>
                        </dl>
                      </article>
                    </div>
                  </section>
                  <div class="record-detail-grid">
                    <section>
                      <div class="section-title compact"><h2>Stock Movement</h2><span>{{ materialUtilization(material) }}% consumed</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Material ID</dt><dd>{{ material.id }}</dd></div>
                        <div><dt>Project ID</dt><dd>{{ material.projectId }}</dd></div>
                        <div><dt>Site</dt><dd>{{ material.site }}</dd></div>
                        <div><dt>Unit</dt><dd>{{ material.unit }}</dd></div>
                        <div><dt>Consumed</dt><dd>{{ formatNumber(material.consumed) }} {{ material.unit }}</dd></div>
                        <div><dt>Pending Purchase</dt><dd>{{ formatNumber(material.approved - material.purchased) }} {{ material.unit }}</dd></div>
                      </dl>
                    </section>
                    <aside>
                      <div class="section-title compact"><h2>Procurement</h2><span>Vendor and approval</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Vendor</dt><dd>{{ material.vendor }}</dd></div>
                        <div><dt>PO Number</dt><dd>{{ material.poNumber }}</dd></div>
                        <div><dt>Approval Status</dt><dd>{{ material.status }}</dd></div>
                        <div><dt>Stock Risk</dt><dd>{{ materialStockRisk(material) }}</dd></div>
                      </dl>
                    </aside>
                  </div>
                </article>
              </ng-container>

              <ng-template #materialCards>
                <div class="card-grid">
                  <article
                    *ngFor="let material of filteredMaterials()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open material details for ' + material.name"
                    (click)="selectMaterial(material)"
                    (keydown.enter)="selectMaterial(material)"
                    (keydown.space)="selectMaterial(material)"
                  >
                    <div class="card-top"><ion-icon name="cube-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('materials', material, $event)" aria-label="Edit material"><ion-icon name="create-outline"></ion-icon></button><span>{{ material.status }}</span></div>
                    <h2>{{ material.name }}</h2>
                    <p>{{ projectName(material.projectId) }} / {{ material.site }}</p>
                    <dl>
                      <div><dt>Project ID</dt><dd>{{ material.projectId }}</dd></div>
                      <div><dt>Purchased</dt><dd>{{ formatNumber(material.purchased) }} {{ material.unit }}</dd></div>
                      <div><dt>Consumed</dt><dd>{{ formatNumber(material.consumed) }} {{ material.unit }}</dd></div>
                      <div><dt>Current Site Stock</dt><dd>{{ formatNumber(material.purchased - material.consumed) }} {{ material.unit }}</dd></div>
                      <div><dt>Vendor</dt><dd>{{ material.vendor }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'vendors'" class="module-stack">
              <ng-container *ngIf="selectedVendor() as vendor; else vendorCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedVendor.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Vendors
                      </button>
                      <h2>{{ vendor.name }}</h2>
                      <p>{{ vendor.materialType }} supplier / {{ vendor.address }}</p>
                    </div>
                    <span>{{ vendor.id }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Supply Entries</span><strong>{{ materialsForVendor(vendor).length }}</strong></div>
                    <div><span>Total Purchased</span><strong>{{ vendorPurchasedUnits(vendor) }}</strong></div>
                    <div><span>GST Number</span><strong>{{ vendor.gst }}</strong></div>
                    <div><span>Phone</span><strong>{{ vendor.phone }}</strong></div>
                  </div>
                  <section>
                    <div class="section-title compact"><h2>Supplied Material by Site</h2><span>{{ materialsForVendor(vendor).length }} rows</span></div>
                    <div class="insight-card-grid">
                      <article *ngFor="let material of materialsForVendor(vendor)" class="insight-card">
                        <div class="card-top"><ion-icon name="cube-outline"></ion-icon><span>{{ material.status }}</span></div>
                        <h3>{{ material.name }}</h3>
                        <p>{{ projectName(material.projectId) }} / {{ material.site }}</p>
                        <dl>
                          <div><dt>PO Number</dt><dd>{{ material.poNumber }}</dd></div>
                          <div><dt>Purchased</dt><dd>{{ formatNumber(material.purchased) }} {{ material.unit }}</dd></div>
                          <div><dt>Used</dt><dd>{{ formatNumber(material.consumed) }} {{ material.unit }}</dd></div>
                          <div><dt>Remaining</dt><dd>{{ formatNumber(material.purchased - material.consumed) }} {{ material.unit }}</dd></div>
                          <div><dt>Needed</dt><dd>{{ formatNumber(materialNeeded(material)) }} {{ material.unit }}</dd></div>
                        </dl>
                      </article>
                    </div>
                  </section>
                  <div class="table-wrap">
                    <table>
                      <thead><tr><th>Material</th><th>Project</th><th>Site</th><th>PO</th><th>Purchased</th><th>Consumed</th><th>Remaining</th><th>Status</th></tr></thead>
                      <tbody>
                        <tr *ngFor="let material of materialsForVendor(vendor)">
                          <td>{{ material.name }}</td>
                          <td>{{ projectName(material.projectId) }}</td>
                          <td>{{ material.site }}</td>
                          <td>{{ material.poNumber }}</td>
                          <td>{{ formatNumber(material.purchased) }} {{ material.unit }}</td>
                          <td>{{ formatNumber(material.consumed) }} {{ material.unit }}</td>
                          <td>{{ formatNumber(material.purchased - material.consumed) }} {{ material.unit }}</td>
                          <td>{{ material.status }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </ng-container>

              <ng-template #vendorCards>
                <div class="card-grid">
                  <article
                    *ngFor="let vendor of filteredVendors()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open supply details for vendor ' + vendor.name"
                    (click)="selectVendor(vendor)"
                    (keydown.enter)="selectVendor(vendor)"
                    (keydown.space)="selectVendor(vendor)"
                  >
                    <div class="card-top"><ion-icon name="business-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('vendors', vendor, $event)" aria-label="Edit vendor"><ion-icon name="create-outline"></ion-icon></button><span>{{ vendor.materialType }}</span></div>
                    <h2>{{ vendor.name }}</h2>
                    <p>{{ vendor.address }}</p>
                    <dl>
                      <div><dt>Vendor ID</dt><dd>{{ vendor.id }}</dd></div>
                      <div><dt>Phone</dt><dd>{{ vendor.phone }}</dd></div>
                      <div><dt>GST</dt><dd>{{ vendor.gst }}</dd></div>
                      <div><dt>Supply Rows</dt><dd>{{ materialsForVendor(vendor).length }}</dd></div>
                      <div><dt>Total Purchased</dt><dd>{{ vendorPurchasedUnits(vendor) }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'subcontract'" class="module-stack">
              <ng-container *ngIf="selectedSubcontractor() as row; else subcontractCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedSubcontractor.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Subcontracts
                      </button>
                      <h2>{{ row.name }}</h2>
                      <p>{{ row.workPackage }} / {{ projectName(row.projectId) }} / {{ row.site }}</p>
                    </div>
                    <span class="status-pill">{{ row.paymentStatus }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Contract Value</span><strong>{{ formatMoney(row.contractValue) }}</strong></div>
                    <div><span>Advance Paid</span><strong>{{ formatMoney(row.advancePaid) }}</strong></div>
                    <div><span>Balance</span><strong>{{ formatMoney(row.contractValue - row.advancePaid) }}</strong></div>
                    <div><span>Approval</span><strong>{{ row.approvalStatus }}</strong></div>
                  </div>
                  <section>
                    <div class="section-title compact"><h2>Related Subcontracts in This Project</h2><span>{{ subcontractorsForProject(row.projectId).length }} packages</span></div>
                    <div class="insight-card-grid">
                      <article *ngFor="let item of subcontractorsForProject(row.projectId)" class="insight-card">
                        <div class="card-top"><ion-icon name="construct-outline"></ion-icon><span>{{ item.paymentStatus }}</span></div>
                        <h3>{{ item.name }}</h3>
                        <p>{{ item.site }} / {{ item.workPackage }}</p>
                        <dl>
                          <div><dt>Contract</dt><dd>{{ formatMoney(item.contractValue) }}</dd></div>
                          <div><dt>Advance</dt><dd>{{ formatMoney(item.advancePaid) }}</dd></div>
                          <div><dt>Remaining</dt><dd>{{ formatMoney(item.contractValue - item.advancePaid) }}</dd></div>
                          <div><dt>Due</dt><dd>{{ item.dueDate }}</dd></div>
                        </dl>
                      </article>
                    </div>
                  </section>
                  <div class="record-detail-grid">
                    <section>
                      <div class="section-title compact"><h2>Work Package</h2><span>{{ row.id }}</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Project</dt><dd>{{ projectName(row.projectId) }}</dd></div>
                        <div><dt>Site</dt><dd>{{ row.site }}</dd></div>
                        <div><dt>Scope</dt><dd>{{ row.workPackage }}</dd></div>
                        <div><dt>Supervisor</dt><dd>{{ row.supervisor }}</dd></div>
                      </dl>
                    </section>
                    <aside>
                      <div class="section-title compact"><h2>Schedule</h2><span>Timeline</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Start Date</dt><dd>{{ row.startDate }}</dd></div>
                        <div><dt>Due Date</dt><dd>{{ row.dueDate }}</dd></div>
                        <div><dt>Payment Status</dt><dd>{{ row.paymentStatus }}</dd></div>
                        <div><dt>Balance Share</dt><dd>{{ subcontractBalancePercent(row) }}%</dd></div>
                      </dl>
                    </aside>
                  </div>
                </article>
              </ng-container>

              <ng-template #subcontractCards>
                <div class="card-grid">
                  <article
                    *ngFor="let row of filteredSubcontractors()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open subcontract details for ' + row.name"
                    (click)="selectSubcontractor(row)"
                    (keydown.enter)="selectSubcontractor(row)"
                    (keydown.space)="selectSubcontractor(row)"
                  >
                    <div class="card-top"><ion-icon name="construct-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('subcontract', row, $event)" aria-label="Edit subcontract"><ion-icon name="create-outline"></ion-icon></button><span>{{ row.paymentStatus }}</span></div>
                    <h2>{{ row.name }}</h2>
                    <p>{{ row.workPackage }}</p>
                    <dl>
                      <div><dt>Subcontract ID</dt><dd>{{ row.id }}</dd></div>
                      <div><dt>Project</dt><dd>{{ projectName(row.projectId) }}</dd></div>
                      <div><dt>Site</dt><dd>{{ row.site }}</dd></div>
                      <div><dt>Contract</dt><dd>{{ formatMoney(row.contractValue) }}</dd></div>
                      <div><dt>Balance</dt><dd>{{ formatMoney(row.contractValue - row.advancePaid) }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'labours'" class="module-stack">
              <ng-container *ngIf="selectedLabour() as row; else labourCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedLabour.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Labours
                      </button>
                      <h2>{{ row.party }}</h2>
                      <p>{{ row.category }} / {{ projectName(row.projectId) }} / {{ row.site }}</p>
                    </div>
                    <span class="status-pill" [ngClass]="statusClass(row.status)">{{ row.status }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Weekly Pay</span><strong>{{ formatMoney(labourWeeklyPay(row)) }}</strong></div>
                    <div><span>Present Count</span><strong>{{ row.presentCount }}</strong></div>
                    <div><span>Present Days</span><strong>{{ row.presentDays }}</strong></div>
                    <div><span>Payment Mode</span><strong>{{ row.paymentMode }}</strong></div>
                  </div>
                  <section>
                    <div class="section-title compact"><h2>Labour Records for This Party</h2><span>{{ labourRowsForParty(row).length }} site rows</span></div>
                    <div class="insight-card-grid">
                      <article *ngFor="let item of labourRowsForParty(row)" class="insight-card">
                        <div class="card-top"><ion-icon name="people-outline"></ion-icon><span>{{ item.status }}</span></div>
                        <h3>{{ item.site }}</h3>
                        <p>{{ projectName(item.projectId) }} / {{ item.category }}</p>
                        <dl>
                          <div><dt>Present Count</dt><dd>{{ item.presentCount }}</dd></div>
                          <div><dt>Present Days</dt><dd>{{ item.presentDays }}</dd></div>
                          <div><dt>Absent Days</dt><dd>{{ item.absentDays }}</dd></div>
                          <div><dt>Overtime</dt><dd>{{ item.overtime }} hrs</dd></div>
                          <div><dt>Weekly Pay</dt><dd>{{ formatMoney(labourWeeklyPay(item)) }}</dd></div>
                        </dl>
                      </article>
                    </div>
                  </section>
                  <div class="record-detail-grid">
                    <section>
                      <div class="section-title compact"><h2>Attendance</h2><span>{{ row.id }}</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Working Site</dt><dd>{{ row.site }}</dd></div>
                        <div><dt>Date of Join</dt><dd>{{ projectStart(row.projectId) }}</dd></div>
                        <div><dt>Shift</dt><dd>{{ row.shift }}</dd></div>
                        <div><dt>Notes</dt><dd>{{ row.notes }}</dd></div>
                      </dl>
                    </section>
                    <aside>
                      <div class="section-title compact"><h2>Wage Calculation</h2><span>Current week</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Daily Wage</dt><dd>{{ formatMoney(row.dailyWage) }}</dd></div>
                        <div><dt>Overtime</dt><dd>{{ row.overtime }} hrs</dd></div>
                        <div><dt>Late Fine</dt><dd>{{ formatMoney(row.lateFine) }}</dd></div>
                        <div><dt>Absent Days</dt><dd>{{ row.absentDays }}</dd></div>
                      </dl>
                    </aside>
                  </div>
                </article>
              </ng-container>

              <ng-template #labourCards>
                <div class="card-grid">
                  <article
                    *ngFor="let row of filteredLabour()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open labour details for ' + row.party"
                    (click)="selectLabour(row)"
                    (keydown.enter)="selectLabour(row)"
                    (keydown.space)="selectLabour(row)"
                  >
                    <div class="card-top"><ion-icon name="people-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('labours', row, $event)" aria-label="Edit labour"><ion-icon name="create-outline"></ion-icon></button><span>{{ row.status }}</span></div>
                    <h2>{{ row.party }}</h2>
                    <p>{{ row.category }} / {{ projectName(row.projectId) }}</p>
                    <dl>
                      <div><dt>Labour ID</dt><dd>{{ row.id }}</dd></div>
                      <div><dt>Working Site</dt><dd>{{ row.site }}</dd></div>
                      <div><dt>Date of Join</dt><dd>{{ projectStart(row.projectId) }}</dd></div>
                      <div><dt>Present Count</dt><dd>{{ row.presentCount }}</dd></div>
                      <div><dt>Weekly Pay</dt><dd>{{ formatMoney(labourWeeklyPay(row)) }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'supervisors'" class="module-stack">
              <ng-container *ngIf="selectedSupervisor() as supervisor; else supervisorCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedSupervisor.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Supervisors
                      </button>
                      <h2>{{ supervisor.name }}</h2>
                      <p>{{ supervisor.role }} / {{ supervisor.assignedProject }}</p>
                    </div>
                    <span class="status-pill" [ngClass]="statusClass(supervisor.status)">{{ supervisor.status }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Cash Limit</span><strong>{{ formatMoney(supervisor.cashLimit) }}</strong></div>
                    <div><span>Active Advances</span><strong>{{ formatMoney(supervisor.activeAdvances) }}</strong></div>
                    <div><span>Available Limit</span><strong>{{ formatMoney(supervisor.cashLimit - supervisor.activeAdvances) }}</strong></div>
                    <div><span>Phone</span><strong>{{ supervisor.phone }}</strong></div>
                  </div>
                  <section>
                    <div class="section-title compact"><h2>Projects Managed by Supervisor</h2><span>{{ projectsForSupervisor(supervisor).length }} projects</span></div>
                    <div class="insight-card-grid">
                      <article *ngFor="let project of projectsForSupervisor(supervisor)" class="insight-card">
                        <div class="card-top"><ion-icon name="business-outline"></ion-icon><span>{{ project.status }}</span></div>
                        <h3>{{ project.name }}</h3>
                        <p>{{ project.client }} / {{ project.sites.join(', ') }}</p>
                        <dl>
                          <div><dt>Value</dt><dd>{{ formatMoney(project.totalValue) }}</dd></div>
                          <div><dt>Received</dt><dd>{{ formatMoney(project.receivedAmount) }}</dd></div>
                          <div><dt>Pending</dt><dd>{{ formatMoney(project.totalValue - project.receivedAmount) }}</dd></div>
                          <div><dt>Completion</dt><dd>{{ project.completion }}%</dd></div>
                        </dl>
                      </article>
                    </div>
                  </section>
                  <div class="record-detail-grid">
                    <section>
                      <div class="section-title compact"><h2>Assignment</h2><span>{{ supervisor.id }}</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Assigned Project</dt><dd>{{ supervisor.assignedProject }}</dd></div>
                        <div><dt>Assigned Site</dt><dd>{{ supervisor.assignedSite }}</dd></div>
                        <div><dt>Role</dt><dd>{{ supervisor.role }}</dd></div>
                        <div><dt>Status</dt><dd>{{ supervisor.status }}</dd></div>
                      </dl>
                    </section>
                    <aside>
                      <div class="section-title compact"><h2>Authority</h2><span>Controls</span></div>
                      <dl class="compact-ledger">
                        <div><dt>Approval Authority</dt><dd>{{ supervisor.approvalAuthority }}</dd></div>
                        <div><dt>Cash Utilization</dt><dd>{{ supervisorCashUtilization(supervisor) }}%</dd></div>
                        <div><dt>Ledger Risk</dt><dd>{{ supervisorCashRisk(supervisor) }}</dd></div>
                      </dl>
                    </aside>
                  </div>
                </article>
              </ng-container>

              <ng-template #supervisorCards>
                <div class="card-grid">
                  <article
                    *ngFor="let supervisor of filteredSupervisors()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open supervisor details for ' + supervisor.name"
                    (click)="selectSupervisor(supervisor)"
                    (keydown.enter)="selectSupervisor(supervisor)"
                    (keydown.space)="selectSupervisor(supervisor)"
                  >
                    <div class="card-top"><ion-icon name="id-card-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('supervisors', supervisor, $event)" aria-label="Edit supervisor"><ion-icon name="create-outline"></ion-icon></button><span>{{ supervisor.status }}</span></div>
                    <h2>{{ supervisor.name }}</h2>
                    <p>{{ supervisor.role }}</p>
                    <dl>
                      <div><dt>Supervisor ID</dt><dd>{{ supervisor.id }}</dd></div>
                      <div><dt>Phone</dt><dd>{{ supervisor.phone }}</dd></div>
                      <div><dt>Project</dt><dd>{{ supervisor.assignedProject }}</dd></div>
                      <div><dt>Cash Limit</dt><dd>{{ formatMoney(supervisor.cashLimit) }}</dd></div>
                      <div><dt>Active Advances</dt><dd>{{ formatMoney(supervisor.activeAdvances) }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'expenses'" class="module-stack">
              <div class="subfolder-tabs">
                <button type="button" [class.active]="expenseMode() === 'site'" (click)="expenseMode.set('site')">Site Expense</button>
                <button type="button" [class.active]="expenseMode() === 'general'" (click)="expenseMode.set('general')">General Expense</button>
              </div>

              <ng-container *ngIf="expenseMode() === 'site'; else generalExpenseBlock">
                <ng-container *ngIf="selectedExpenseGroup() as group; else siteExpenseCards">
                  <article class="detail-card focused-detail-card">
                    <div class="section-title">
                      <div>
                        <button type="button" class="back-action" (click)="selectedExpenseGroup.set(null)">
                          <ion-icon name="arrow-back-outline"></ion-icon>
                          Site Expenses
                        </button>
                        <h2>{{ group.site }} Expense Details</h2>
                        <p>{{ group.projectName }} / {{ group.supervisor }}</p>
                      </div>
                      <span>{{ group.rows.length }} entries</span>
                    </div>
                    <div class="detail-metrics">
                      <div><span>Total Received</span><strong>{{ formatMoney(group.received) }}</strong></div>
                      <div><span>Total Spent</span><strong>{{ formatMoney(group.spent) }}</strong></div>
                      <div><span>Balance</span><strong>{{ formatMoney(group.balance) }}</strong></div>
                      <div><span>Spend Ratio</span><strong>{{ expenseSpendRatio(group) }}%</strong></div>
                    </div>
                    <div class="expense-detail-grid">
                      <div class="pie-card">
                        <div class="expense-pie" [style.background]="pieBackground(group)"></div>
                        <dl>
                          <div><dt>Spent</dt><dd>{{ formatMoney(group.spent) }}</dd></div>
                          <div><dt>Balance</dt><dd>{{ formatMoney(group.balance) }}</dd></div>
                          <div><dt>Ledger Risk</dt><dd>{{ expenseRisk(group) }}</dd></div>
                        </dl>
                      </div>
                      <div class="table-wrap">
                        <table>
                          <thead><tr><th>Date</th><th>Description</th><th>Spent</th><th>Received</th><th>Reference</th><th>Status</th></tr></thead>
                          <tbody>
                            <tr *ngFor="let row of group.rows">
                              <td>{{ row.date }}</td>
                              <td>{{ row.description }}</td>
                              <td>{{ formatMoney(row.spent) }}</td>
                              <td>{{ formatMoney(row.received) }}</td>
                              <td>{{ row.reference }}</td>
                              <td>{{ row.status }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </article>
                </ng-container>

                <ng-template #siteExpenseCards>
                  <div class="card-grid">
                    <article
                      *ngFor="let group of filteredSiteExpenseGroups()"
                      class="erp-card selectable"
                      role="button"
                      tabindex="0"
                      [attr.aria-label]="'Open site expense details for ' + group.projectName + ' ' + group.site"
                      (click)="selectExpenseGroup(group)"
                      (keydown.enter)="selectExpenseGroup(group)"
                      (keydown.space)="selectExpenseGroup(group)"
                    >
                      <div class="card-top"><ion-icon name="receipt-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditExpenseGroup(group, $event)" aria-label="Edit site expense"><ion-icon name="create-outline"></ion-icon></button><span>{{ group.rows.length }} entries</span></div>
                      <h2>{{ group.site }}</h2>
                      <p>{{ group.projectName }} / {{ group.supervisor }}</p>
                      <dl>
                        <div><dt>Total Received</dt><dd>{{ formatMoney(group.received) }}</dd></div>
                        <div><dt>Total Spent</dt><dd>{{ formatMoney(group.spent) }}</dd></div>
                        <div><dt>Balance</dt><dd>{{ formatMoney(group.balance) }}</dd></div>
                        <div><dt>Risk</dt><dd>{{ expenseRisk(group) }}</dd></div>
                      </dl>
                    </article>
                  </div>
                </ng-template>
              </ng-container>

              <ng-template #generalExpenseBlock>
                <ng-container *ngIf="selectedGeneralExpense() as row; else generalExpenseCards">
                  <article class="detail-card focused-detail-card">
                    <div class="section-title">
                      <div>
                        <button type="button" class="back-action" (click)="selectedGeneralExpense.set(null)">
                          <ion-icon name="arrow-back-outline"></ion-icon>
                          General Expenses
                        </button>
                        <h2>{{ row.description }}</h2>
                        <p>Head Office / {{ row.supervisor }}</p>
                      </div>
                      <span class="status-pill" [ngClass]="statusClass(row.status)">{{ row.status }}</span>
                    </div>
                    <div class="detail-metrics">
                      <div><span>Date</span><strong>{{ row.date }}</strong></div>
                      <div><span>Amount</span><strong>{{ formatMoney(row.spent) }}</strong></div>
                      <div><span>Received</span><strong>{{ formatMoney(row.received) }}</strong></div>
                      <div><span>Reference</span><strong>{{ row.reference }}</strong></div>
                    </div>
                    <dl class="compact-ledger detail-ledger">
                      <div><dt>Expense ID</dt><dd>{{ row.id }}</dd></div>
                      <div><dt>Expense Type</dt><dd>{{ row.type }}</dd></div>
                      <div><dt>Approved Status</dt><dd>{{ row.status }}</dd></div>
                      <div><dt>Net Impact</dt><dd>{{ formatMoney(row.received - row.spent) }}</dd></div>
                    </dl>
                  </article>
                </ng-container>

                <ng-template #generalExpenseCards>
                  <div class="card-grid">
                    <article
                      *ngFor="let row of filteredGeneralExpenses()"
                      class="erp-card selectable"
                      role="button"
                      tabindex="0"
                      [attr.aria-label]="'Open general expense details for ' + row.description"
                      (click)="selectGeneralExpense(row)"
                      (keydown.enter)="selectGeneralExpense(row)"
                      (keydown.space)="selectGeneralExpense(row)"
                    >
                      <div class="card-top"><ion-icon name="wallet-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('expenses', row, $event)" aria-label="Edit expense"><ion-icon name="create-outline"></ion-icon></button><span>{{ row.status }}</span></div>
                      <h2>{{ row.description }}</h2>
                      <p>Head Office / {{ row.supervisor }}</p>
                      <dl>
                        <div><dt>Date</dt><dd>{{ row.date }}</dd></div>
                        <div><dt>Amount</dt><dd>{{ formatMoney(row.spent) }}</dd></div>
                        <div><dt>Reference</dt><dd>{{ row.reference }}</dd></div>
                        <div><dt>Status</dt><dd>{{ row.status }}</dd></div>
                      </dl>
                    </article>
                  </div>
                </ng-template>
              </ng-template>
            </section>

            <section *ngSwitchCase="'payments'" class="module-stack">
              <ng-container *ngIf="selectedPayment() as payment; else paymentCards">
                <article class="detail-card focused-detail-card">
                  <div class="section-title">
                    <div>
                      <button type="button" class="back-action" (click)="selectedPayment.set(null)">
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Payments
                      </button>
                      <h2>{{ payment.id }} Payment Detail</h2>
                      <p>{{ projectName(payment.projectId) }} / {{ payment.mode }}</p>
                    </div>
                    <span class="status-pill" [ngClass]="statusClass(payment.status)">{{ payment.status }}</span>
                  </div>
                  <div class="detail-metrics">
                    <div><span>Amount</span><strong>{{ formatMoney(payment.amount) }}</strong></div>
                    <div><span>Method</span><strong>{{ payment.mode }}</strong></div>
                    <div><span>Transaction ID</span><strong>{{ payment.reference }}</strong></div>
                    <div><span>Receipt</span><strong>{{ payment.receipt }}</strong></div>
                  </div>
                  <dl class="compact-ledger detail-ledger">
                    <div><dt>Payment ID</dt><dd>{{ payment.id }}</dd></div>
                    <div><dt>Project</dt><dd>{{ projectName(payment.projectId) }}</dd></div>
                    <div><dt>Date</dt><dd>{{ payment.date }}</dd></div>
                    <div><dt>Collected By</dt><dd>{{ payment.collectedBy }}</dd></div>
                    <div><dt>Admin Check</dt><dd>{{ payment.status }}</dd></div>
                  </dl>
                </article>
              </ng-container>

              <ng-template #paymentCards>
                <div class="card-grid">
                  <article
                    *ngFor="let payment of filteredPayments()"
                    class="erp-card selectable"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Open payment details for ' + payment.id"
                    (click)="selectPayment(payment)"
                    (keydown.enter)="selectPayment(payment)"
                    (keydown.space)="selectPayment(payment)"
                  >
                    <div class="card-top"><ion-icon name="card-outline"></ion-icon><button type="button" class="edit-card-btn" (click)="openEditForm('payments', payment, $event)" aria-label="Edit payment"><ion-icon name="create-outline"></ion-icon></button><span>{{ payment.status }}</span></div>
                    <h2>{{ payment.id }}</h2>
                    <p>{{ projectName(payment.projectId) }} / {{ payment.mode }}</p>
                    <dl>
                      <div><dt>Amount</dt><dd>{{ formatMoney(payment.amount) }}</dd></div>
                      <div><dt>Date</dt><dd>{{ payment.date }}</dd></div>
                      <div><dt>Transaction ID</dt><dd>{{ payment.reference }}</dd></div>
                      <div><dt>Receipt</dt><dd>{{ payment.receipt }}</dd></div>
                      <div><dt>Collected By</dt><dd>{{ payment.collectedBy }}</dd></div>
                    </dl>
                  </article>
                </div>
              </ng-template>
            </section>

            <section *ngSwitchCase="'reports'" class="module-stack">
              <article class="detail-card">
                <div class="section-title">
                  <h2>Report Register</h2>
                  <div class="report-actions">
                    <button type="button" class="icon-action" (click)="saveReportsAsPdf()"><ion-icon name="document-outline"></ion-icon><span>Save as PDF</span></button>
                    <button type="button" class="icon-action" (click)="exportReportsToExcel()"><ion-icon name="download-outline"></ion-icon><span>Export to Excel</span></button>
                  </div>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Category</th><th>Report Name</th><th>Scope</th><th>Owner</th><th>Format</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr *ngFor="let report of reports()">
                        <td>{{ report.category }}</td>
                        <td>{{ report.name }}</td>
                        <td>{{ report.scope }}</td>
                        <td>{{ report.owner }}</td>
                        <td>{{ report.format }}</td>
                        <td>{{ report.status }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section *ngSwitchCase="'settings'" class="module-stack">
              <div class="settings-grid">
                <article class="erp-card"><div class="card-top"><ion-icon name="color-palette-outline"></ion-icon><span>Workspace</span></div><h2>Professional Admin View</h2><p>Full-window ERP layout with searchable modules, editable cards, and focused site workspaces.</p></article>
                <article class="erp-card"><div class="card-top"><ion-icon name="save-outline"></ion-icon><span>Storage</span></div><h2>Auto Saved Locally</h2><p>Added and edited records are saved in browser localStorage for this prototype workspace.</p></article>
                <article class="erp-card"><div class="card-top"><ion-icon name="shield-checkmark-outline"></ion-icon><span>Access</span></div><h2>Admin Controls</h2><p>Admin can add records, edit cards, filter modules, and export reports from the dashboard.</p></article>
                <article class="erp-card"><div class="card-top"><ion-icon name="options-outline"></ion-icon><span>Filters</span></div><h2>Status Filters</h2><p>Filters support active, approved, pending, completed, paid, part paid, and expense risk states.</p></article>
              </div>
            </section>
          </ng-container>

          <section *ngIf="formModule()" class="form-backdrop" aria-modal="true" role="dialog">
            <form class="record-form" (submit)="$event.preventDefault(); confirmForm()">
              <div class="section-title">
                <div>
                  <span>{{ formMode() === 'add' ? 'Add Card' : 'Edit Card' }}</span>
                  <h2>{{ formTitle() }}</h2>
                </div>
                <button type="button" class="icon-only" (click)="closeForm()" aria-label="Close form"><ion-icon name="close-outline"></ion-icon></button>
              </div>
              <div class="form-grid">
                <label *ngFor="let field of formFields()">
                  <span>{{ field.label }}</span>
                  <input
                    [type]="field.type || 'text'"
                    [value]="formValue(field.key)"
                    (input)="updateFormValue(field.key, $any($event.target).value)"
                    [required]="field.key !== 'id'"
                  />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="ghost-action" (click)="closeForm()">Cancel</button>
                <button type="submit" class="confirm-action">Confirm</button>
              </div>
            </form>
          </section>
        </section>
        </main>
      </ion-content>
    </div>
  `,
  styles: [
    `
      .erp-shell-page {
        --background: #eef3f8;
        color: #172033;
      }

      .erp-split-shell {
        display: grid;
        grid-template-columns: 30% 70%;
        min-height: 100%;
        background: #eef3f8;
      }

      .erp-side-nav {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow: auto;
        border-right: 1px solid #d8e0ea;
        background: #142238;
        color: #ffffff;
        padding: 18px;
      }

      .brand-panel {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        margin-bottom: 18px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
      }

      .brand-panel img {
        width: 58px;
        height: 58px;
        object-fit: contain;
        border-radius: 6px;
        background: #ffffff;
      }

      .brand-panel span,
      .erp-detail-header span,
      .section-title span,
      .card-top span,
      dt,
      .erp-card p,
      .detail-card p {
        color: #64748b;
        font-size: 12px;
        font-weight: 750;
      }

      .brand-panel span {
        color: #aebbd0;
      }

      .brand-panel strong {
        display: block;
        margin-top: 3px;
        font-size: 18px;
      }

      .erp-side-nav nav {
        display: grid;
        gap: 7px;
      }

      .erp-side-nav button,
      .project-list button,
      .section-title button,
      .subfolder-tabs button {
        border: 0;
        font: inherit;
        cursor: pointer;
      }

      .erp-side-nav nav button {
        display: grid;
        grid-template-columns: 22px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        min-height: 44px;
        padding: 0 12px;
        border-radius: 8px;
        background: transparent;
        color: #cbd5e1;
        text-align: left;
      }

      .erp-side-nav nav button.active {
        background: #d4b45a;
        color: #201500;
        font-weight: 850;
      }

      .erp-side-nav small {
        min-width: 28px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        padding: 3px 7px;
        text-align: center;
      }

      .erp-detail-panel {
        min-width:0;
        padding: 22px;
      }

      .erp-detail-header,
      .section-title,
      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .erp-detail-header {
        margin-bottom: 18px;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      .erp-detail-header h1 {
        margin-top: 4px;
        font-size: 30px;
        line-height: 1.12;
      }

      .erp-search {
        display: flex;
        align-items: center;
        gap: 8px;
        width: min(390px, 48%);
        height: 42px;
        padding: 0 12px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
      }

      .erp-search input {
        min-width: 0;
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        font: inherit;
      }

      .erp-filter select {
        height: 42px;
        min-width: 132px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        color: #172033;
        padding: 0 10px;
        font: inherit;
        font-size: 13px;
        font-weight: 750;
      }

      .module-stack {
        display: grid;
        gap: 18px;
      }

      .metric-grid,
      .card-grid,
      .dashboard-grid,
      .detail-metrics,
      .expense-detail-grid {
        display: grid;
        gap: 14px;
      }

      .metric-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .metric-grid article,
      .erp-card,
      .detail-card {
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
      }

      .metric-grid article {
        padding: 16px;
      }

      .metric-grid span,
      .metric-grid small {
        display: block;
        color: #64748b;
        font-size: 12px;
        font-weight: 750;
      }

      .metric-grid strong {
        display: block;
        margin: 10px 0 7px;
        color: #0f172a;
        font-size: 23px;
        line-height: 1.05;
      }

      .dashboard-grid {
        grid-template-columns: 1.4fr 0.8fr;
      }

      .wide-card,
      .dashboard-grid article {
        padding: 16px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
      }

      .project-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .project-list button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        color: #172033;
        text-align: left;
      }

      .project-list span {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
      }

      .compact-ledger,
      .erp-card dl,
      .pie-card dl {
        display: grid;
        gap: 10px;
        margin: 14px 0 0;
      }

      .compact-ledger div,
      .erp-card dl div,
      .pie-card dl div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #edf2f7;
        padding-top: 9px;
      }

      dd {
        margin: 0;
        color: #172033;
        font-weight: 850;
        text-align: right;
      }

      .card-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .erp-card {
        padding: 15px;
      }

      .erp-card.selectable {
        cursor: pointer;
      }

      .erp-card.selected {
        border-color: #b99a3c;
        box-shadow: 0 0 0 3px rgba(212, 180, 90, 0.22);
      }

      .erp-card h2 {
        margin-top: 13px;
        font-size: 18px;
        line-height: 1.2;
      }

      .erp-card p {
        margin-top: 7px;
        line-height: 1.45;
      }

      .card-top ion-icon {
        width: 24px;
        height: 24px;
        color: #0f766e;
      }

      .avatar {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 8px;
        background: #eaf2ff;
        color: #002263;
        font-weight: 900;
      }

      .status-pill {
        border-radius: 999px;
        padding: 5px 9px;
        background: #eef2f7;
        color: #344054;
      }

      .status-pill.active {
        background: #dcfce7;
        color: #166534;
      }

      .status-pill.on-hold {
        background: #fef3c7;
        color: #92400e;
      }

      .detail-card {
        padding: 17px;
      }

      .section-title button {
        min-height: 38px;
        padding: 0 12px;
        border-radius: 8px;
        background: #002263;
        color: #ffffff;
        font-weight: 800;
      }

      .detail-metrics {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 16px 0;
      }

      .detail-metrics div {
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
      }

      .detail-metrics span {
        display: block;
        color: #64748b;
        font-size: 12px;
        font-weight: 750;
      }

      .detail-metrics strong {
        display: block;
        margin-top: 6px;
      }

      .table-wrap {
        width: 100%;
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      table {
        width: 100%;
        min-width: 760px;
        border-collapse: collapse;
        background: #ffffff;
      }

      th,
      td {
        padding: 11px 12px;
        border-bottom: 1px solid #edf2f7;
        color: #172033;
        font-size: 13px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f1f5f9;
        color: #475569;
        font-size: 12px;
        font-weight: 850;
      }

      .subfolder-tabs {
        display: flex;
        gap: 10px;
      }

      .subfolder-tabs button {
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        color: #475569;
        font-weight: 850;
      }

      .subfolder-tabs button.active {
        border-color: #002263;
        background: #002263;
        color: #ffffff;
      }

      .expense-detail-grid {
        grid-template-columns: 220px minmax(0, 1fr);
        margin-top: 16px;
      }

      .pie-card {
        display: grid;
        align-content: start;
        justify-items: center;
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
      }

      .expense-pie {
        width: 150px;
        height: 150px;
        border: 10px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
      }

      .erp-shell-host {
        height: 100%;
        background: #edf2f7;
      }

      .erp-shell-page {
        --background: #edf2f7;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .erp-split-shell {
        min-height: 100vh;
        background: #edf2f7;
      }

      .erp-side-nav {
        display: flex;
        flex-direction: column;
        gap: 14px;
        border-right: 1px solid #d6deea;
        background: #0f1b2f;
        box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
      }

      .brand-panel {
        grid-template-columns: 64px minmax(0, 1fr);
        min-height: 86px;
        margin-bottom: 2px;
        border-color: #263a59;
        background: #14233b;
      }

      .brand-panel img {
        width: 64px;
        height: 64px;
      }

      .brand-panel strong {
        color: #ffffff;
        font-size: 20px;
        letter-spacing: 0;
      }

      .side-section-label {
        margin-top: 2px;
        color: #8fa0b8;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .erp-side-nav nav {
        gap: 8px;
      }

      .erp-side-nav nav button {
        position: relative;
        min-height: 48px;
        border: 1px solid transparent;
        border-radius: 8px;
        color: #d5deec;
        transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
      }

      .erp-side-nav nav button:hover {
        border-color: #2a4063;
        background: #172842;
        color: #ffffff;
      }

      .erp-side-nav nav button.active {
        border-color: #d4b45a;
        background: #f4f0df;
        color: #241a00;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
      }

      .erp-side-nav nav button.active::before {
        content: "";
        position: absolute;
        left: -1px;
        top: 8px;
        bottom: 8px;
        width: 4px;
        border-radius: 999px;
        background: #a98215;
      }

      .erp-side-nav nav button ion-icon {
        width: 20px;
        height: 20px;
      }

      .nav-icon-badge.logo-badge {
        background: #fff7d6;
        color: #8a6b04;
      }

      .erp-side-nav small {
        background: rgba(255, 255, 255, 0.1);
        color: inherit;
        font-size: 11px;
        font-weight: 850;
      }

      .erp-detail-panel {
        display: grid;
        align-content: start;
        gap: 16px;
        padding: 22px 24px 28px;
        background: #edf2f7;
      }

      .erp-detail-header {
        margin: 0;
        padding: 18px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
      }

      .erp-detail-header > div {
        min-width: 0;
      }

      .erp-detail-header span {
        color: #8a6b04;
        font-size: 11px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .erp-detail-header h1 {
        color: #111827;
        font-size: 28px;
        font-weight: 900;
      }

      .erp-detail-header p {
        max-width: 760px;
        margin-top: 7px;
        color: #5c6b80;
        font-size: 13px;
        line-height: 1.5;
      }

      .erp-search {
        flex: 0 0 min(390px, 42%);
        height: 44px;
        border-color: #cfd8e6;
        background: #f8fafc;
      }

      .erp-search:focus-within {
        border-color: #8fa6d2;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(0, 34, 99, 0.1);
      }

      .module-overview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .module-overview div {
        min-height: 72px;
        padding: 13px 14px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
      }

      .module-overview span {
        display: block;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
      }

      .module-overview strong {
        display: block;
        margin-top: 8px;
        color: #111827;
        font-size: 20px;
        line-height: 1.1;
      }

      .module-stack {
        gap: 16px;
      }

      .metric-grid {
        grid-template-columns: repeat(4, minmax(170px, 1fr));
      }

      .metric-grid article {
        position: relative;
        min-height: 142px;
        padding: 16px;
        overflow: hidden;
      }

      .metric-grid article ion-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin-bottom: 12px;
        padding: 7px;
        border-radius: 8px;
        background: #eef6f5;
        color: #0f766e;
      }

      .metric-grid strong {
        font-size: 22px;
      }

      .dashboard-grid {
        grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.8fr);
      }

      .wide-card,
      .dashboard-grid article,
      .erp-card,
      .detail-card {
        border-color: #d8e0ea;
        border-radius: 8px;
        box-shadow: 0 10px 26px rgba(15, 23, 42, 0.055);
      }

      .section-title {
        padding-bottom: 12px;
        border-bottom: 1px solid #edf2f7;
      }

      .section-title h2 {
        color: #111827;
        font-size: 18px;
        font-weight: 900;
      }

      .section-title p {
        margin-top: 4px;
        color: #64748b;
        font-size: 13px;
      }

      .project-list button {
        min-height: 68px;
        background: #ffffff;
      }

      .project-list button:hover {
        border-color: #9bb1ce;
        background: #f8fbff;
      }

      .project-list small {
        display: grid;
        place-items: center;
        min-width: 46px;
        height: 34px;
        border-radius: 999px;
        background: #eaf2ff;
        color: #002263;
        font-weight: 900;
      }

      .card-grid {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        align-items: stretch;
      }

      .erp-card {
        display: flex;
        min-height: 258px;
        flex-direction: column;
        padding: 16px;
        transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }

      .erp-card.selectable:hover,
      .erp-card:hover {
        transform: translateY(-2px);
        border-color: #aebbd0;
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.09);
      }

      .erp-card.selected {
        border-color: #b7942f;
        background: #fffdf6;
      }

      .erp-card h2 {
        color: #111827;
        font-size: 17px;
        font-weight: 900;
      }

      .erp-card p {
        color: #5c6b80;
      }

      .erp-card dl {
        margin-top: auto;
        padding-top: 12px;
      }

      .compact-ledger div,
      .erp-card dl div,
      .pie-card dl div {
        align-items: flex-start;
      }

      .card-top {
        min-height: 36px;
      }

      .card-top > span,
      .status-pill {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        border-radius: 999px;
        padding: 4px 9px;
        background: #eef2f7;
        color: #475569;
        font-size: 11px;
        font-weight: 850;
      }

      .detail-card {
        padding: 18px;
      }

      .focused-detail-card {
        display: grid;
        gap: 16px;
      }

      .back-action {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 34px;
        margin-bottom: 10px;
        padding: 0 10px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        color: #334155;
        font-size: 13px;
        font-weight: 850;
      }

      .back-action ion-icon {
        width: 17px;
        height: 17px;
      }

      .client-profile-strip {
        display: grid;
        grid-template-columns: 64px repeat(4, minmax(0, 1fr));
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
      }

      .avatar.large {
        width: 58px;
        height: 58px;
        font-size: 20px;
      }

      .client-profile-strip span {
        display: block;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
      }

      .client-profile-strip strong {
        display: block;
        margin-top: 5px;
        color: #111827;
        font-size: 15px;
        line-height: 1.25;
      }

      .client-site-workspace {
        margin: 4px 0 18px;
      }

      .site-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 10px;
      }

      .site-card {
        display: grid;
        gap: 5px;
        min-height: 112px;
        padding: 16px;
        border: 1px solid #c8d5e5;
        border-radius: 8px;
        background: linear-gradient(180deg, #ffffff, #eef4ff);
        color: #172033;
        text-align: left;
        font: inherit;
        cursor: pointer;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
      }

      .site-card span,
      .site-card small {
        color: #64748b;
        font-size: 12px;
        font-weight: 750;
      }

      .site-card strong {
        font-size: 17px;
        font-weight: 900;
      }

      .site-card:hover {
        border-color: #002263;
        transform: translateY(-1px);
      }

      .site-card.active {
        border-color: #002263;
        background: #eef4ff;
        box-shadow: 0 0 0 3px rgba(0, 34, 99, 0.12);
      }

      .section-title.compact {
        margin-bottom: 12px;
      }

      .section-title.compact h2 {
        font-size: 16px;
      }

      .detail-metrics div {
        background: #ffffff;
      }

      .table-wrap {
        background: #ffffff;
      }

      table {
        min-width: 820px;
      }

      th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f8fafc;
        color: #475569;
        text-transform: uppercase;
      }

      .subfolder-tabs {
        width: fit-content;
        padding: 4px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
      }

      .subfolder-tabs button {
        border-color: transparent;
        border-radius: 6px;
      }

      .expense-detail-grid {
        grid-template-columns: 240px minmax(0, 1fr);
      }

      .pie-card {
        min-height: 260px;
      }

      @media (max-width: 1100px) {
        .erp-detail-header,
        .erp-detail-panel {
          gap: 14px;
        }

        .module-overview {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .client-profile-strip {
          grid-template-columns: 64px repeat(2, minmax(0, 1fr));
        }

        .client-upper-nav {
          grid-template-columns: repeat(4, minmax(130px, 1fr));
        }

        .client-upper-nav .nav-title {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 760px) {
        .erp-side-nav {
          height: auto;
        }

        .erp-side-nav nav {
          grid-template-columns: 1fr;
        }

        .erp-detail-header {
          padding: 16px;
        }

        .erp-search,
        .module-overview {
          width: 100%;
          grid-template-columns: 1fr;
        }

        .client-profile-strip {
          grid-template-columns: 1fr;
        }

        .client-upper-nav {
          position: static;
          grid-template-columns: 1fr;
        }
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .admin-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex: 0 0 min(560px, 52%);
        min-width: 320px;
      }

      .admin-user-chip {
        display: grid;
        min-width: 112px;
        min-height: 44px;
        align-content: center;
        padding: 0 12px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #fffdf6;
      }

      .admin-user-chip span {
        color: #8a6b04;
        font-size: 11px;
        font-weight: 850;
      }

      .admin-user-chip strong {
        color: #111827;
        font-size: 13px;
        line-height: 1.2;
      }

      .icon-action,
      .confirm-action,
      .ghost-action,
      .edit-card-btn,
      .icon-only {
        border: 0;
        font: inherit;
        cursor: pointer;
      }

      .icon-action {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 42px;
        padding: 0 12px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        background: #ffffff;
        color: #172033;
        font-size: 13px;
        font-weight: 850;
      }

      .add-action,
      .confirm-action {
        border-color: #002263;
        background: #002263;
        color: #ffffff;
      }

      .report-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      .edit-card-btn,
      .icon-only {
        display: inline-grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: #eef4ff;
        color: #002263;
      }

      .form-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 22px;
        background: rgba(15, 23, 42, 0.45);
      }

      .record-form {
        width: min(820px, 100%);
        max-height: calc(100vh - 44px);
        overflow: auto;
        padding: 18px;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .form-grid label {
        display: grid;
        gap: 6px;
        color: #64748b;
        font-size: 12px;
        font-weight: 850;
      }

      .form-grid input {
        min-height: 42px;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        padding: 0 10px;
        color: #172033;
        font: inherit;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
      }

      .confirm-action,
      .ghost-action {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 8px;
        font-weight: 850;
      }

      .ghost-action {
        background: #eef2f7;
        color: #334155;
      }

      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .erp-card.selectable:focus-visible,
      .erp-side-nav nav button:focus-visible,
      .client-upper-nav button:focus-visible,
      .site-card:focus-visible,
      .project-list button:focus-visible,
      .section-title button:focus-visible,
      .subfolder-tabs button:focus-visible,
      .back-action:focus-visible {
        outline: 3px solid rgba(0, 34, 99, 0.28);
        outline-offset: 3px;
      }

      .erp-card dl div {
        min-height: 29px;
      }

      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .erp-shell-host,
      .erp-shell-page,
      .erp-shell-page::part(scroll) {
        width: 100%;
        height: 100%;
      }

      .erp-shell-page::part(scroll) {
        overflow: hidden;
      }

      .erp-split-shell {
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
      }

      .erp-side-nav {
        height: 100vh;
        min-height: 100vh;
      }

      .erp-detail-panel {
        height: 100vh;
        overflow-y: auto;
        padding: 18px;
      }

      .module-stack {
        min-height: 0;
      }

      .focused-detail-card {
        min-height: calc(100vh - 178px);
      }

      .record-detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 16px;
      }

      .record-detail-grid > section,
      .record-detail-grid > aside {
        min-width: 0;
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
      }

      .insight-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .insight-card {
        display: flex;
        min-height: 220px;
        flex-direction: column;
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
      }

      .insight-card h3 {
        margin: 10px 0 4px;
        color: #111827;
        font-size: 16px;
        font-weight: 900;
      }

      .insight-card p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.45;
      }

      .insight-card dl {
        display: grid;
        gap: 8px;
        margin: auto 0 0;
        padding-top: 12px;
      }

      .insight-card dl div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-top: 1px solid #edf2f7;
        padding-top: 7px;
      }

      .client-upper-nav {
        position: sticky;
        top: 0;
        z-index: 20;
        display: grid;
        grid-template-columns: minmax(180px, 0.9fr) repeat(7, minmax(118px, 1fr));
        gap: 6px;
        align-items: center;
        padding: 10px;
        margin-bottom: 16px;
        border: 1px solid #c8d5e5;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      }

      .client-upper-nav .nav-title {
        display: grid;
        min-width:0;
        padding: 8px;
      }

      .client-upper-nav button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 44px;
        min-width: 0;
        padding: 0 10px;
        border: 1px solid #d8e0ea;
        border-radius: 7px;
        background: #f8fafc;
        color: #475569;
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
      }

      .client-upper-nav button.active {
        border-color: #002263;
        background: #002263;
        color: #ffffff;
        box-shadow: inset 0 -3px 0 #d4b45a;
      }
      
      .client-upper-nav button:hover:not(.active) {
        border-color: #b8c7da;
        background: #eef4ff;
        color: #002263;
      }

      .detail-ledger {
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
      }

      @media (max-width: 760px) {
        .admin-toolbar {
          display: grid;
          width: 100%;
          min-width: 0;
          flex: 1 1 auto;
        }

        .erp-split-shell,
        .erp-side-nav,
        .erp-detail-panel {
          height: auto;
          min-height: 0;
          overflow: visible;
        }

        .erp-shell-page::part(scroll) {
          overflow: auto;
        }

        .focused-detail-card {
          min-height: 0;
        }

        .record-detail-grid {
          grid-template-columns: 1fr;
        }

        .erp-filter select {
          width: 100%;
        }
      }

      .erp-split-shell {
        grid-template-columns: 20% 80%;
      }

      @media (max-width: 1100px) {
        .erp-split-shell {
          grid-template-columns: 230px minmax(0, 1fr);
        }
      }

      @media (max-width: 760px) {
        .erp-split-shell {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversalDashboardPage {
  readonly data = inject(ErpDataService);
  readonly router = inject(Router);
  readonly formatMoney = formatMoney;
  readonly formatNumber = formatNumber;
  readonly statusClass = statusClass;
  readonly todayLabel = "2026-06-08";

  readonly navItems: { key: NavKey; label: string; icon: string; logo?: boolean }[] = [
    { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
    { key: "clients", label: "Client", icon: "people-outline" },
    { key: "materials", label: "Materials", icon: "cube-outline" },
    { key: "vendors", label: "Vendors", icon: "business-outline" },
    { key: "subcontract", label: "Subcontract", icon: "construct-outline" },
    { key: "labours", label: "Labours", icon: "people-outline" },
    { key: "supervisors", label: "Supervisors", icon: "shield-checkmark-outline", logo: true },
    { key: "expenses", label: "Expenses", icon: "receipt-outline" },
    { key: "payments", label: "Payment", icon: "card-outline", logo: true },
    { key: "reports", label: "Report", icon: "document-text-outline" },
    { key: "settings", label: "Settings", icon: "settings-outline" },
  ];

  readonly clientSections: { key: ClientSection; label: string; icon: string }[] = [
    { key: "materials", label: "Material", icon: "cube-outline" },
    { key: "labours", label: "Labours", icon: "people-outline" },
    { key: "vendors", label: "Vendors", icon: "business-outline" },
    { key: "subcontract", label: "Subcontract", icon: "construct-outline" },
    { key: "supervisors", label: "Supervisor", icon: "id-card-outline" },
    { key: "siteExpense", label: "Site Expense", icon: "receipt-outline" },
    { key: "reports", label: "Report", icon: "document-text-outline" },
  ];

  readonly activeNav = signal<NavKey>("dashboard");
  readonly expenseMode = signal<ExpenseMode>("site");
  readonly activeClientSection = signal<ClientSection | null>(null);
  readonly activeClientSiteKey = signal<string | null>(null);
  readonly searchText = signal("");
  readonly statusFilter = signal("all");
  readonly labourCategoryFilter = signal("all");
  readonly selectedClient = signal<Client | null>(null);
  readonly selectedMaterial = signal<MaterialRow | null>(null);
  readonly selectedVendor = signal<Vendor | null>(null);
  readonly selectedSubcontractor = signal<Subcontractor | null>(null);
  readonly selectedLabour = signal<LabourRow | null>(null);
  readonly selectedSupervisor = signal<Supervisor | null>(null);
  readonly selectedGeneralExpense = signal<ExpenseRow | null>(null);
  readonly selectedExpenseGroup = signal<SiteExpenseGroup | null>(null);
  readonly selectedPayment = signal<PaymentRow | null>(null);
  readonly formModule = signal<EditableModule | null>(null);
  readonly formMode = signal<FormMode>("add");
  readonly formDraft = signal<Record<string, string>>({});
  readonly editingId = signal<string | null>(null);

  readonly activeProjects = computed(() => this.data.projects().filter((project) => project.status === "Active"));
  readonly totalProjectValue = computed(() => this.data.projects().reduce((sum, project) => sum + project.totalValue, 0));
  readonly totalReceived = computed(() => this.data.projects().reduce((sum, project) => sum + project.receivedAmount, 0));
  readonly totalPending = computed(() => this.totalProjectValue() - this.totalReceived());
  readonly totalSiteExpense = computed(() => this.data.expenses().filter((row) => row.type === "Site Expense").reduce((sum, row) => sum + row.spent, 0));
  readonly pendingMaterials = computed(() => this.data.materials().filter((row) => row.status === "Pending").length);
  readonly pendingLabour = computed(() => this.data.labour().filter((row) => row.status === "Pending").length);
  readonly pendingExpenses = computed(() => this.data.expenses().filter((row) => row.status === "Pending").length);
  readonly labourCategories = computed(() => [...new Set([...this.data.labour().map((row) => row.category).filter(Boolean), "Civil", "Concrete", "Mason", "Plumber", "Electrical"])].sort());

  readonly siteExpenseGroups = computed<SiteExpenseGroup[]>(() => {
    const groups = new Map<string, SiteExpenseGroup>();
    for (const row of this.data.expenses().filter((expense) => expense.type === "Site Expense")) {
      const project = this.projectById(row.projectId);
      const key = `${row.projectId}:${row.site}`;
      const current =
        groups.get(key) ??
        ({
          key,
          projectId: row.projectId,
          projectName: project?.name ?? row.projectId,
          site: row.site,
          supervisor: row.supervisor,
          spent: 0,
          received: 0,
          balance: 0,
          rows: [],
        } satisfies SiteExpenseGroup);
      current.spent += row.spent;
      current.received += row.received;
      current.balance = current.received - current.spent;
      current.rows = [...current.rows, row];
      groups.set(key, current);
    }
    return [...groups.values()];
  });

  readonly reports = computed(() =>
    [
      ["Financial", "Payment Collection Report", "All client receipts and pending collection", "Accountant", "PDF / Excel", "Ready"],
      ["Financial", "Expense Report", "Site and general expense ledgers", "Admin", "PDF / Excel", "Ready"],
      ["Labour", "Attendance Report", "Labour attendance, wage, overtime, and fine", "Project Manager", "Excel", "Ready"],
      ["Material", "Inventory Report", "Purchased, consumed, remaining stock by site", "Project Manager", "Excel", "Ready"],
      ["Vendor", "Vendor Purchase Report", "Vendor supply records by project and site", "Admin", "Excel", "Ready"],
      ["Subcontract", "Subcontractor Ledger", "Work package value, advance, balance, status", "Project Manager", "PDF / Excel", "Ready"],
      ["Project", "Project Summary", "Client, site, value, progress, and balance", "Admin", "PDF", "Ready"],
    ].map(([category, name, scope, owner, format, status]) => ({ category, name, scope, owner, format, status })),
  );

  selectNav(key: NavKey) {
    this.activeNav.set(key);
    this.searchText.set("");
    this.statusFilter.set("all");
    this.labourCategoryFilter.set("all");
    this.selectedPayment.set(null);
    this.activeClientSiteKey.set(null);
    this.activeClientSection.set(null);
  }

  setStatusFilter(value: string) {
    this.statusFilter.set(value);
  }

  setLabourCategoryFilter(value: string) {
    this.labourCategoryFilter.set(value);
  }

  selectClient(client: Client) {
    this.selectedClient.set(client);
    this.activeClientSection.set(null);
    this.activeClientSiteKey.set(null);
  }

  openClientSite(site: ClientSite) {
    this.activeClientSiteKey.set(site.key);
    this.activeClientSection.set("materials");
  }

  selectVendor(vendor: Vendor) {
    this.selectedVendor.set(vendor);
  }

  selectMaterial(material: MaterialRow) {
    this.selectedMaterial.set(material);
  }

  selectSubcontractor(subcontractor: Subcontractor) {
    this.selectedSubcontractor.set(subcontractor);
  }

  selectLabour(labour: LabourRow) {
    this.selectedLabour.set(labour);
  }

  selectSupervisor(supervisor: Supervisor) {
    this.selectedSupervisor.set(supervisor);
  }

  selectGeneralExpense(expense: ExpenseRow) {
    this.selectedGeneralExpense.set(expense);
  }

  selectExpenseGroup(group: SiteExpenseGroup) {
    this.selectedExpenseGroup.set(group);
  }

  selectPayment(payment: PaymentRow) {
    this.selectedPayment.set(payment);
  }

  activeAddModule(): EditableModule | null {
    const client = this.selectedClient();
    if (this.activeNav() === "clients" && client && this.activeClientSite(client)) {
      const section = this.activeClientSection();
      if (section === "materials") return "materials";
      if (section === "labours") return "labours";
      if (section === "vendors") return "vendors";
      if (section === "subcontract") return "subcontract";
      if (section === "supervisors") return "supervisors";
      if (section === "siteExpense") return "expenses";
      return null;
    }
    const nav = this.activeNav();
    return ["clients", "materials", "vendors", "subcontract", "labours", "supervisors", "expenses", "payments"].includes(nav) ? (nav as EditableModule) : null;
  }

  openAddForm() {
    const module = this.activeAddModule();
    if (!module) return;
    this.formModule.set(module);
    this.formMode.set("add");
    this.editingId.set(null);
    this.formDraft.set(this.defaultDraft(module));
  }

  openEditForm(module: EditableModule, row: Record<string, unknown>, event?: Event) {
    event?.stopPropagation();
    this.formModule.set(module);
    this.formMode.set("edit");
    this.editingId.set(String(row["id"] ?? ""));
    this.formDraft.set(this.rowToDraft(module, row));
  }

  openEditExpenseGroup(group: SiteExpenseGroup, event?: Event) {
    const row = group.rows[0];
    if (row) this.openEditForm("expenses", row as unknown as Record<string, unknown>, event);
  }

  closeForm() {
    this.formModule.set(null);
    this.editingId.set(null);
    this.formDraft.set({});
  }

  formTitle(): string {
    const module = this.formModule();
    const labels: Record<EditableModule, string> = {
      clients: "Client Card",
      materials: "Material Card",
      vendors: "Vendor Card",
      subcontract: "Subcontract Card",
      labours: "Labour Card",
      supervisors: "Supervisor Card",
      expenses: "Expense Card",
      payments: "Payment Card",
    };
    return module ? labels[module] : "ERP Card";
  }

  formFields(): FormField[] {
    const module = this.formModule();
    if (!module) return [];
    return this.fieldsFor(module);
  }

  formValue(key: string): string {
    return this.formDraft()[key] ?? "";
  }

  updateFormValue(key: string, value: string) {
    this.formDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  confirmForm() {
    const module = this.formModule();
    if (!module) return;
    const draft = this.formDraft();
    if (this.formMode() === "edit") this.updateRecord(module, draft);
    else this.addRecord(module, draft);
    this.closeForm();
  }

  activeEyebrow(): string {
    const item = this.navItems.find((nav) => nav.key === this.activeNav());
    return item?.label ?? "ERP";
  }

  activeTitle(): string {
    const titles: Record<NavKey, string> = {
      dashboard: "Construction Dashboard",
      clients: "Client Workspace",
      materials: "Site Material Stock",
      vendors: "Vendor Supply Directory",
      subcontract: "Subcontract Register",
      labours: "Labour Attendance Cards",
      supervisors: "Supervisor Directory",
      expenses: "Expense Folders",
      payments: "Payment Register",
      reports: "Report Register",
      settings: "ERP Settings",
    };
    return titles[this.activeNav()];
  }

  activeDescription(): string {
    const descriptions: Record<NavKey, string> = {
      dashboard: "A control-room view of project value, receipts, pending balances, expense pressure, and active work.",
      clients: "Scan client cards, compare sites and receivables, then open the complete client/project workspace.",
      materials: "Track requested, approved, purchased, consumed, and remaining material stock across all sites.",
      vendors: "Review supplier profiles and inspect which material each vendor supplied to each project site.",
      subcontract: "Monitor work packages, advance paid, balance, due dates, and payment state for subcontractors.",
      labours: "View labour parties by site, category, attendance count, joining reference, and weekly payable amount.",
      supervisors: "See supervisor assignments, cash limits, active advances, and approval authority at a glance.",
      expenses: "Separate site and general expenses, then drill into site ledgers with chart and transaction detail.",
      payments: "Review UPI, NEFT, cash, cheque, and bank transfer receipts with transaction IDs and approval status.",
      reports: "Keep export-ready registers for finance, materials, labour, vendors, subcontractors, and projects.",
      settings: "Manage the prototype workspace assumptions, storage behavior, roles, and display preferences.",
    };
    return descriptions[this.activeNav()];
  }

  summaryStats(): Array<{ label: string; value: string | number }> {
    const stats: Record<NavKey, Array<{ label: string; value: string | number }>> = {
      dashboard: [
        { label: "Active Projects", value: this.activeProjects().length },
        { label: "Collection Rate", value: this.collectionRate() },
        { label: "Pending Approvals", value: this.pendingMaterials() + this.pendingLabour() + this.pendingExpenses() },
      ],
      clients: [
        { label: "Total Clients", value: this.data.clients().length },
        { label: "Active Clients", value: this.data.activeClients() },
        { label: "Total Sites", value: this.data.projects().reduce((sum, project) => sum + project.sites.length, 0) },
      ],
      materials: [
        { label: "Material Rows", value: this.data.materials().length },
        { label: "Pending Requests", value: this.pendingMaterials() },
        { label: "Vendors Used", value: new Set(this.data.materials().map((row) => row.vendor)).size },
      ],
      vendors: [
        { label: "Vendor Profiles", value: this.data.vendors().length },
        { label: "Supply Entries", value: this.data.materials().length },
        { label: "Material Types", value: new Set(this.data.vendors().map((row) => row.materialType)).size },
      ],
      subcontract: [
        { label: "Subcontracts", value: this.data.subcontractors().length },
        { label: "Pending Approval", value: this.data.subcontractors().filter((row) => row.approvalStatus === "Pending").length },
        { label: "Open Balance", value: formatMoney(this.data.subcontractors().reduce((sum, row) => sum + row.contractValue - row.advancePaid, 0)) },
      ],
      labours: [
        { label: "Labour Rows", value: this.data.labour().length },
        { label: "Present Count", value: this.data.labour().reduce((sum, row) => sum + row.presentCount, 0) },
        { label: "Pending Rows", value: this.pendingLabour() },
      ],
      supervisors: [
        { label: "Supervisors", value: this.data.supervisors().length },
        { label: "Active", value: this.data.supervisors().filter((row) => row.status === "Active").length },
        { label: "Active Advances", value: formatMoney(this.data.supervisors().reduce((sum, row) => sum + row.activeAdvances, 0)) },
      ],
      expenses: [
        { label: "Site Ledgers", value: this.siteExpenseGroups().length },
        { label: "Site Spend", value: formatMoney(this.totalSiteExpense()) },
        { label: "General Spend", value: formatMoney(this.data.expenses().filter((row) => row.type === "General Expense").reduce((sum, row) => sum + row.spent, 0)) },
      ],
      payments: [
        { label: "Payments", value: this.data.payments().length },
        { label: "Total Received", value: formatMoney(this.data.payments().reduce((sum, row) => sum + row.amount, 0)) },
        { label: "UPI / NEFT", value: this.data.payments().filter((row) => row.mode === "UPI" || row.mode === "NEFT").length },
      ],
      reports: [
        { label: "Reports", value: this.reports().length },
        { label: "Formats", value: "PDF / Excel" },
        { label: "Status", value: "Ready" },
      ],
      settings: [
        { label: "Storage", value: "Local" },
        { label: "Roles", value: "4" },
        { label: "Mode", value: "Prototype" },
      ],
    };
    return stats[this.activeNav()];
  }

  navCount(key: NavKey): number | string {
    const counts: Record<NavKey, number | string> = {
      dashboard: this.data.projects().length,
      clients: this.data.clients().length,
      materials: this.data.materials().length,
      vendors: this.data.vendors().length,
      subcontract: this.data.subcontractors().length,
      labours: this.data.labour().length,
      supervisors: this.data.supervisors().length,
      expenses: this.data.expenses().length,
      payments: this.data.payments().length,
      reports: this.reports().length,
      settings: "3",
    };
    return counts[key];
  }

  collectionRate(): string {
    return this.totalProjectValue() ? `${Math.round((this.totalReceived() / this.totalProjectValue()) * 100)}%` : "0%";
  }

  filteredClients(): Client[] {
    return this.filterRows(this.data.clients(), (client) => [client.name, client.address, client.mobile, client.supervisor], (client) => client.status);
  }

  filteredMaterials(): MaterialRow[] {
    return this.filterRows(this.data.materials(), (row) => [row.name, row.site, row.vendor, this.projectName(row.projectId)], (row) => row.status);
  }

  filteredVendors(): Vendor[] {
    return this.filterRows(this.data.vendors(), (vendor) => [vendor.name, vendor.materialType, vendor.phone, vendor.address, vendor.gst], (vendor) => (this.materialsForVendor(vendor).some((row) => row.status === "Pending") ? "Pending" : "Approved"));
  }

  filteredSubcontractors(): Subcontractor[] {
    return this.filterRows(this.data.subcontractors(), (row) => [row.name, row.site, row.workPackage, row.supervisor, this.projectName(row.projectId)], (row) => row.paymentStatus);
  }

  filteredLabour(): LabourRow[] {
    return this.filterLabourCategory(this.filterRows(this.data.labour(), (row) => [row.party, row.site, row.category, this.projectName(row.projectId)], (row) => row.status));
  }

  filteredSupervisors(): Supervisor[] {
    return this.filterRows(this.data.supervisors(), (row) => [row.name, row.role, row.phone, row.assignedProject, row.assignedSite], (row) => row.status);
  }

  filteredSiteExpenseGroups(): SiteExpenseGroup[] {
    return this.filterRows(this.siteExpenseGroups(), (row) => [row.site, row.projectName, row.supervisor], (row) => this.expenseRisk(row));
  }

  filteredGeneralExpenses(): ExpenseRow[] {
    return this.filterRows(this.data.expenses().filter((row) => row.type === "General Expense"), (row) => [row.description, row.supervisor, row.reference], (row) => row.status);
  }

  filteredPayments(): PaymentRow[] {
    return this.filterRows(this.data.payments(), (row) => [row.id, row.mode, row.receipt, row.reference, row.collectedBy, this.projectName(row.projectId)], (row) => row.status);
  }

  dailyMaterialRequests(): number {
    return this.data.materials().filter((row) => row.status === "Pending").reduce((sum, row) => sum + row.requested, 0);
  }

  dailyPaymentTotal(): number {
    return this.data.payments().filter((row) => row.date === this.todayLabel).reduce((sum, row) => sum + row.amount, 0);
  }

  dailyLabourPresent(): number {
    return this.data.labour().reduce((sum, row) => sum + row.presentCount, 0);
  }

  dailyExpenseTotal(): number {
    return this.data.expenses().filter((row) => row.date === this.todayLabel || row.status === "Pending").reduce((sum, row) => sum + row.spent, 0);
  }

  clientSummary(client: Client) {
    return this.data.clientSummary(client);
  }

  projectsForClient(client: Client): Project[] {
    return this.data.projectsForClient(client);
  }

  sitesForClient(client: Client): ClientSite[] {
    return this.projectsForClient(client).flatMap((project) =>
      project.sites.map((site) => ({
        key: `${project.id}:${site}`,
        projectId: project.id,
        projectName: project.name,
        site,
        status: project.status,
        completion: project.completion,
        startDate: project.startDate,
      })),
    );
  }

  activeClientSite(client: Client): ClientSite | null {
    const sites = this.sitesForClient(client);
    const key = this.activeClientSiteKey();
    if (!key) return null;
    return sites.find((site) => site.key === key) ?? null;
  }

  siteLabourPresent(client: Client): number {
    return this.labourForClientSite(client).reduce((sum, row) => sum + row.presentCount, 0);
  }

  siteExpenseTotal(client: Client): number {
    return this.siteExpenseGroupsForClientSite(client).reduce((sum, group) => sum + group.spent, 0);
  }

  projectIdsForClient(client: Client): string[] {
    return this.projectsForClient(client).map((project) => project.id);
  }

  materialsForClient(client: Client): MaterialRow[] {
    const projectIds = new Set(this.projectIdsForClient(client));
    return this.data.materials().filter((row) => projectIds.has(row.projectId));
  }

  materialsForClientSite(client: Client): MaterialRow[] {
    const site = this.activeClientSite(client);
    if (!site) return this.materialsForClient(client);
    return this.materialsForClient(client).filter((row) => row.projectId === site.projectId && row.site === site.site);
  }

  filteredMaterialsForClientSite(client: Client): MaterialRow[] {
    return this.filterRows(this.materialsForClientSite(client), (row) => [row.name, row.site, row.vendor, row.poNumber, this.projectName(row.projectId)], (row) => row.status);
  }

  labourForClient(client: Client): LabourRow[] {
    const projectIds = new Set(this.projectIdsForClient(client));
    return this.data.labour().filter((row) => projectIds.has(row.projectId));
  }

  labourForClientSite(client: Client): LabourRow[] {
    const site = this.activeClientSite(client);
    if (!site) return this.labourForClient(client);
    return this.labourForClient(client).filter((row) => row.projectId === site.projectId && row.site === site.site);
  }

  filteredLabourForClientSite(client: Client): LabourRow[] {
    return this.filterLabourCategory(this.filterRows(this.labourForClientSite(client), (row) => [row.party, row.site, row.category, row.paymentMode, this.projectName(row.projectId)], (row) => row.status));
  }

  subcontractorsForClient(client: Client): Subcontractor[] {
    const projectIds = new Set(this.projectIdsForClient(client));
    return this.data.subcontractors().filter((row) => projectIds.has(row.projectId));
  }

  subcontractorsForClientSite(client: Client): Subcontractor[] {
    const site = this.activeClientSite(client);
    if (!site) return this.subcontractorsForClient(client);
    return this.subcontractorsForClient(client).filter((row) => row.projectId === site.projectId && row.site === site.site);
  }

  filteredSubcontractorsForClientSite(client: Client): Subcontractor[] {
    return this.filterRows(this.subcontractorsForClientSite(client), (row) => [row.name, row.site, row.workPackage, row.supervisor, this.projectName(row.projectId)], (row) => row.paymentStatus);
  }

  vendorsForClient(client: Client): Vendor[] {
    const vendorNames = new Set(this.materialsForClient(client).map((row) => row.vendor));
    return this.data.vendors().filter((vendor) => vendorNames.has(vendor.name) || this.materialsForClient(client).some((row) => row.name.toLowerCase().includes(vendor.materialType.toLowerCase())));
  }

  vendorsForClientSite(client: Client): Vendor[] {
    const rows = this.materialsForClientSite(client);
    const vendorNames = new Set(rows.map((row) => row.vendor));
    return this.data.vendors().filter((vendor) => vendorNames.has(vendor.name) || rows.some((row) => row.name.toLowerCase().includes(vendor.materialType.toLowerCase())));
  }

  filteredVendorsForClientSite(client: Client): Vendor[] {
    return this.filterRows(this.vendorsForClientSite(client), (vendor) => [vendor.name, vendor.materialType, vendor.phone, vendor.address, vendor.gst], (vendor) => (this.materialsForClientSiteVendor(client, vendor).some((row) => row.status === "Pending") ? "Pending" : "Approved"));
  }

  materialsForClientVendor(client: Client, vendor: Vendor): MaterialRow[] {
    return this.materialsForClient(client).filter((row) => row.vendor === vendor.name || row.name.toLowerCase().includes(vendor.materialType.toLowerCase()));
  }

  materialsForClientSiteVendor(client: Client, vendor: Vendor): MaterialRow[] {
    return this.materialsForClientSite(client).filter((row) => row.vendor === vendor.name || row.name.toLowerCase().includes(vendor.materialType.toLowerCase()));
  }

  clientVendorPurchasedUnits(client: Client, vendor: Vendor): string {
    const rows = this.materialsForClientVendor(client, vendor);
    if (!rows.length) return "No supply";
    const total = rows.reduce((sum, row) => sum + row.purchased, 0);
    const units = [...new Set(rows.map((row) => row.unit))].join(", ");
    return `${formatNumber(total)} ${units}`;
  }

  clientVendorMaterialNames(client: Client, vendor: Vendor): string {
    const names = [...new Set(this.materialsForClientVendor(client, vendor).map((row) => row.name))];
    return names.join(", ") || "No material";
  }

  clientSiteVendorPurchasedUnits(client: Client, vendor: Vendor): string {
    const rows = this.materialsForClientSiteVendor(client, vendor);
    if (!rows.length) return "No supply";
    const total = rows.reduce((sum, row) => sum + row.purchased, 0);
    const units = [...new Set(rows.map((row) => row.unit))].join(", ");
    return `${formatNumber(total)} ${units}`;
  }

  clientSiteVendorMaterialNames(client: Client, vendor: Vendor): string {
    const names = [...new Set(this.materialsForClientSiteVendor(client, vendor).map((row) => row.name))];
    return names.join(", ") || "No material";
  }

  supervisorsForClient(client: Client): Supervisor[] {
    const supervisorNames = new Set(this.projectsForClient(client).map((project) => project.supervisor));
    return this.data.supervisors().filter((supervisor) => supervisorNames.has(supervisor.name));
  }

  supervisorsForClientSite(client: Client): Supervisor[] {
    const site = this.activeClientSite(client);
    if (!site) return this.supervisorsForClient(client);
    const project = this.projectById(site.projectId);
    return this.data.supervisors().filter((supervisor) => supervisor.name === project?.supervisor || (supervisor.assignedProject === project?.name && supervisor.assignedSite.includes(site.site)));
  }

  filteredSupervisorsForClientSite(client: Client): Supervisor[] {
    return this.filterRows(this.supervisorsForClientSite(client), (row) => [row.name, row.role, row.phone, row.assignedProject, row.assignedSite], (row) => row.status);
  }

  siteExpenseGroupsForClient(client: Client): SiteExpenseGroup[] {
    const projectIds = new Set(this.projectIdsForClient(client));
    return this.siteExpenseGroups().filter((group) => projectIds.has(group.projectId));
  }

  siteExpenseGroupsForClientSite(client: Client): SiteExpenseGroup[] {
    const site = this.activeClientSite(client);
    if (!site) return this.siteExpenseGroupsForClient(client);
    return this.siteExpenseGroupsForClient(client).filter((group) => group.projectId === site.projectId && group.site === site.site);
  }

  filteredSiteExpenseGroupsForClientSite(client: Client): SiteExpenseGroup[] {
    return this.filterRows(this.siteExpenseGroupsForClientSite(client), (row) => [row.site, row.projectName, row.supervisor], (row) => this.expenseRisk(row));
  }

  clientReports(client: Client): Array<{ name: string; scope: string; detail: string; owner: string; status: string }> {
    const summary = this.clientSummary(client);
    return [
      { name: "Client Project Summary", scope: client.name, detail: `${summary.projectCount} projects / ${summary.activeSites} active sites`, owner: "Admin", status: "Ready" },
      { name: "Material Consumption", scope: "Client sites", detail: `${this.materialsForClient(client).length} material rows`, owner: "Project Manager", status: "Ready" },
      { name: "Labour Wage Report", scope: "Client projects", detail: `${this.labourForClient(client).length} labour rows`, owner: "Accountant", status: "Ready" },
      { name: "Site Expense Ledger", scope: "Client sites", detail: formatMoney(summary.siteExpense), owner: "Admin", status: "Ready" },
      { name: "Receivable Statement", scope: client.name, detail: `${formatMoney(summary.pending)} pending`, owner: "Accountant", status: "Ready" },
    ];
  }

  firstStartDate(client: Client): string {
    const starts = this.projectsForClient(client)
      .map((project) => project.startDate)
      .filter(Boolean)
      .sort();
    return starts[0] ?? "Not started";
  }

  materialsForVendor(vendor: Vendor): MaterialRow[] {
    return this.data.materials().filter((row) => row.vendor === vendor.name || row.name.toLowerCase().includes(vendor.materialType.toLowerCase()));
  }

  materialRowsFor(material: MaterialRow): MaterialRow[] {
    const name = material.name.trim().toLowerCase();
    return this.data.materials().filter((row) => row.name.trim().toLowerCase() === name);
  }

  materialTotal(material: MaterialRow, key: "requested" | "approved" | "purchased" | "consumed"): number {
    return this.materialRowsFor(material).reduce((sum, row) => sum + row[key], 0);
  }

  materialNeeded(material: MaterialRow): number {
    return Math.max(material.requested - material.purchased, 0);
  }

  materialNeededTotal(material: MaterialRow): number {
    return this.materialRowsFor(material).reduce((sum, row) => sum + this.materialNeeded(row), 0);
  }

  materialUtilization(material: MaterialRow): number {
    return material.purchased ? Math.round((material.consumed / material.purchased) * 100) : 0;
  }

  materialStockRisk(material: MaterialRow): string {
    const remaining = material.purchased - material.consumed;
    if (material.status === "Pending") return "Approval pending";
    if (remaining <= 0) return "Reorder required";
    if (material.purchased && remaining / material.purchased < 0.25) return "Low stock";
    return "Healthy";
  }

  vendorPurchasedUnits(vendor: Vendor): string {
    const rows = this.materialsForVendor(vendor);
    if (!rows.length) return "No supply";
    const total = rows.reduce((sum, row) => sum + row.purchased, 0);
    const units = [...new Set(rows.map((row) => row.unit))].join(", ");
    return `${formatNumber(total)} ${units}`;
  }

  labourWeeklyPay(row: LabourRow): number {
    return row.dailyWage * row.presentDays * row.presentCount + row.overtime * 175 - row.lateFine;
  }

  labourRowsForParty(row: LabourRow): LabourRow[] {
    const party = row.party.trim().toLowerCase();
    return this.data.labour().filter((item) => item.party.trim().toLowerCase() === party);
  }

  subcontractorsForProject(projectId: string): Subcontractor[] {
    return this.data.subcontractorsForProject(projectId);
  }

  projectsForSupervisor(supervisor: Supervisor): Project[] {
    return this.data.projects().filter((project) => project.supervisor === supervisor.name || project.name === supervisor.assignedProject);
  }

  subcontractBalancePercent(row: Subcontractor): number {
    return row.contractValue ? Math.round(((row.contractValue - row.advancePaid) / row.contractValue) * 100) : 0;
  }

  supervisorCashUtilization(supervisor: Supervisor): number {
    return supervisor.cashLimit ? Math.round((supervisor.activeAdvances / supervisor.cashLimit) * 100) : 0;
  }

  supervisorCashRisk(supervisor: Supervisor): string {
    const utilization = this.supervisorCashUtilization(supervisor);
    if (utilization >= 90) return "Near cash limit";
    if (utilization >= 60) return "Monitor advances";
    return "Within limit";
  }

  expenseSpendRatio(group: SiteExpenseGroup): number {
    return group.received ? Math.round((group.spent / group.received) * 100) : group.spent ? 100 : 0;
  }

  expenseRisk(group: SiteExpenseGroup): string {
    if (group.balance < 0) return "Overspent";
    if (this.expenseSpendRatio(group) >= 85) return "Low balance";
    return "Within balance";
  }

  projectName(projectId: string): string {
    return this.projectById(projectId)?.name ?? projectId;
  }

  projectStart(projectId: string): string {
    return this.projectById(projectId)?.startDate ?? "Not set";
  }

  pieBackground(group: SiteExpenseGroup): string {
    const total = Math.max(group.received, group.spent, 1);
    const spentDegrees = Math.min(360, Math.round((group.spent / total) * 360));
    return `conic-gradient(#be123c 0deg ${spentDegrees}deg, #16a34a ${spentDegrees}deg 360deg)`;
  }

  openClient(client: Client) {
    const project = this.data.firstProjectForClient(client);
    if (project) void this.router.navigate(["/clients", client.id, "projects", project.id, "materials"]);
    else void this.router.navigate(["/clients", client.id]);
  }

  openProject(project: Project) {
    const client = this.data.clients().find((row) => row.projectIds.includes(project.id));
    if (client) void this.router.navigate(["/clients", client.id, "projects", project.id, "materials"]);
  }

  saveReportsAsPdf() {
    const rows = this.reports();
    const html = `
      <html><head><title>Annai Builders Reports</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#172033} table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d8e0ea;padding:8px;text-align:left} th{background:#eef3f8}
      </style></head><body><h1>Report Register</h1><table><thead><tr><th>Category</th><th>Report</th><th>Scope</th><th>Owner</th><th>Format</th><th>Status</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${row.category}</td><td>${row.name}</td><td>${row.scope}</td><td>${row.owner}</td><td>${row.format}</td><td>${row.status}</td></tr>`).join("")}</tbody></table></body></html>`;
    const printWindow = window.open("", "_blank", "width=1100,height=760");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  exportReportsToExcel() {
    const rows = this.reports();
    const table = `<table><thead><tr><th>Category</th><th>Report</th><th>Scope</th><th>Owner</th><th>Format</th><th>Status</th></tr></thead><tbody>${rows
      .map((row) => `<tr><td>${row.category}</td><td>${row.name}</td><td>${row.scope}</td><td>${row.owner}</td><td>${row.format}</td><td>${row.status}</td></tr>`)
      .join("")}</tbody></table>`;
    this.downloadFile("annai-report-register.xls", "application/vnd.ms-excel", table);
  }

  private fieldsFor(module: EditableModule): FormField[] {
    const fields: Record<EditableModule, FormField[]> = {
      clients: [
        { key: "name", label: "Client Name" },
        { key: "mobile", label: "Mobile" },
        { key: "address", label: "Address" },
        { key: "supervisor", label: "Supervisor" },
        { key: "status", label: "Status" },
      ],
      materials: [
        { key: "projectId", label: "Project ID" },
        { key: "site", label: "Site" },
        { key: "name", label: "Material" },
        { key: "unit", label: "Unit" },
        { key: "requested", label: "Requested", type: "number" },
        { key: "approved", label: "Approved", type: "number" },
        { key: "purchased", label: "Purchased", type: "number" },
        { key: "consumed", label: "Used", type: "number" },
        { key: "vendor", label: "Vendor" },
        { key: "poNumber", label: "PO Number" },
        { key: "status", label: "Status" },
      ],
      vendors: [
        { key: "name", label: "Vendor Name" },
        { key: "materialType", label: "Material Type" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address" },
        { key: "gst", label: "GST" },
      ],
      subcontract: [
        { key: "projectId", label: "Project ID" },
        { key: "site", label: "Site" },
        { key: "name", label: "Subcontractor" },
        { key: "workPackage", label: "Work Package" },
        { key: "contractValue", label: "Contract Value", type: "number" },
        { key: "advancePaid", label: "Advance Paid", type: "number" },
        { key: "startDate", label: "Start Date", type: "date" },
        { key: "dueDate", label: "Due Date", type: "date" },
        { key: "supervisor", label: "Supervisor" },
        { key: "approvalStatus", label: "Approval Status" },
        { key: "paymentStatus", label: "Payment Status" },
      ],
      labours: [
        { key: "projectId", label: "Project ID" },
        { key: "site", label: "Site" },
        { key: "party", label: "Labour Name / Party" },
        { key: "category", label: "Category" },
        { key: "dailyWage", label: "Daily Wage", type: "number" },
        { key: "presentDays", label: "Present Days", type: "number" },
        { key: "absentDays", label: "Absent Days", type: "number" },
        { key: "presentCount", label: "Present Count", type: "number" },
        { key: "overtime", label: "Overtime", type: "number" },
        { key: "lateFine", label: "Late Fine", type: "number" },
        { key: "shift", label: "Shift" },
        { key: "paymentMode", label: "Payment Mode" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" },
      ],
      supervisors: [
        { key: "name", label: "Supervisor Name" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "assignedProject", label: "Assigned Project" },
        { key: "assignedSite", label: "Assigned Site" },
        { key: "cashLimit", label: "Cash Limit", type: "number" },
        { key: "activeAdvances", label: "Active Advances", type: "number" },
        { key: "approvalAuthority", label: "Approval Authority" },
        { key: "status", label: "Status" },
      ],
      expenses: [
        { key: "projectId", label: "Project ID" },
        { key: "site", label: "Site" },
        { key: "supervisor", label: "Supervisor" },
        { key: "date", label: "Date", type: "date" },
        { key: "description", label: "Description" },
        { key: "type", label: "Type" },
        { key: "received", label: "Received", type: "number" },
        { key: "spent", label: "Spent", type: "number" },
        { key: "reference", label: "Reference" },
        { key: "status", label: "Status" },
      ],
      payments: [
        { key: "projectId", label: "Project ID" },
        { key: "date", label: "Date", type: "date" },
        { key: "amount", label: "Amount", type: "number" },
        { key: "mode", label: "Mode" },
        { key: "receipt", label: "Receipt" },
        { key: "reference", label: "Transaction ID" },
        { key: "collectedBy", label: "Collected By" },
        { key: "status", label: "Status" },
      ],
    };
    return fields[module];
  }

  private defaultDraft(module: EditableModule): Record<string, string> {
    const client = this.selectedClient();
    const site = client ? this.activeClientSite(client) : null;
    const project = site ? this.projectById(site.projectId) : this.data.projects()[0];
    const today = new Date().toISOString().slice(0, 10);
    const base: Record<string, string> = { projectId: project?.id ?? "AB-1024", site: site?.site ?? project?.sites[0] ?? "Main Site", status: "Approved" };
    const defaults: Record<EditableModule, Record<string, string>> = {
      clients: { name: "", mobile: "", address: "", supervisor: project?.supervisor ?? "", status: "Active" },
      materials: { ...base, name: "", unit: "Nos", requested: "0", approved: "0", purchased: "0", consumed: "0", vendor: "", poNumber: "Pending" },
      vendors: { name: "", materialType: "", phone: "", address: "", gst: "" },
      subcontract: { ...base, name: "", workPackage: "", contractValue: "0", advancePaid: "0", startDate: today, dueDate: today, supervisor: project?.supervisor ?? "", approvalStatus: "Approved", paymentStatus: "Part Paid" },
      labours: { ...base, party: "", category: "", dailyWage: "0", presentDays: "0", absentDays: "0", presentCount: "0", overtime: "0", lateFine: "0", shift: "Day", paymentMode: "NEFT", notes: "" },
      supervisors: { name: "", phone: "", role: "Site Supervisor", assignedProject: project?.name ?? "", assignedSite: site?.site ?? "", cashLimit: "0", activeAdvances: "0", approvalAuthority: "Material, Labour, Expense", status: "Active" },
      expenses: { ...base, supervisor: project?.supervisor ?? "", date: today, description: "", type: site ? "Site Expense" : "General Expense", received: "0", spent: "0", reference: "", status: "Approved" },
      payments: { projectId: project?.id ?? "AB-1024", date: today, amount: "0", mode: "NEFT", receipt: "", reference: "", collectedBy: "Admin", status: "Approved" },
    };
    return defaults[module];
  }

  private rowToDraft(module: EditableModule, row: Record<string, unknown>): Record<string, string> {
    const draft = this.defaultDraft(module);
    for (const field of this.fieldsFor(module)) draft[field.key] = String(row[field.key] ?? draft[field.key] ?? "");
    return draft;
  }

  private addRecord(module: EditableModule, draft: Record<string, string>) {
    const id = this.nextId(module);
    if (module === "clients") {
      const client = this.data.addClient({ name: draft["name"], mobile: draft["mobile"], address: draft["address"], supervisor: draft["supervisor"] });
      this.data.updateClient(client.id, { status: draft["status"] as Client["status"] });
      return;
    }
    const record = this.buildRecord(module, id, draft);
    this.updateSignal(module, (rows) => [record, ...rows]);
  }

  private updateRecord(module: EditableModule, draft: Record<string, string>) {
    const id = this.editingId();
    if (!id) return;
    if (module === "clients") {
      this.data.updateClient(id, {
        name: draft["name"],
        mobile: draft["mobile"],
        address: draft["address"],
        supervisor: draft["supervisor"],
        status: draft["status"] as Client["status"],
      });
      return;
    }
    const record = this.buildRecord(module, id, draft);
    this.updateSignal(module, (rows) => rows.map((row) => (String((row as { id: string }).id) === id ? record : row)));
  }

  private buildRecord(module: EditableModule, id: string, draft: Record<string, string>): any {
    const numberValue = (key: string) => Number(draft[key] || 0);
    const builders: Record<EditableModule, () => any> = {
      clients: () => draft,
      materials: () => ({ id, projectId: draft["projectId"], site: draft["site"], name: draft["name"], unit: draft["unit"], requested: numberValue("requested"), approved: numberValue("approved"), purchased: numberValue("purchased"), consumed: numberValue("consumed"), vendor: draft["vendor"], poNumber: draft["poNumber"], status: draft["status"] }),
      vendors: () => ({ id, name: draft["name"], materialType: draft["materialType"], phone: draft["phone"], address: draft["address"], gst: draft["gst"] }),
      subcontract: () => ({ id, projectId: draft["projectId"], site: draft["site"], name: draft["name"], workPackage: draft["workPackage"], contractValue: numberValue("contractValue"), advancePaid: numberValue("advancePaid"), startDate: draft["startDate"], dueDate: draft["dueDate"], supervisor: draft["supervisor"], approvalStatus: draft["approvalStatus"], paymentStatus: draft["paymentStatus"] }),
      labours: () => ({ id, projectId: draft["projectId"], site: draft["site"], party: draft["party"], category: draft["category"], dailyWage: numberValue("dailyWage"), presentDays: numberValue("presentDays"), absentDays: numberValue("absentDays"), presentCount: numberValue("presentCount"), overtime: numberValue("overtime"), lateFine: numberValue("lateFine"), shift: draft["shift"], notes: draft["notes"], paymentMode: draft["paymentMode"], status: draft["status"] }),
      supervisors: () => ({ id, name: draft["name"], phone: draft["phone"], role: draft["role"], assignedProject: draft["assignedProject"], assignedSite: draft["assignedSite"], cashLimit: numberValue("cashLimit"), activeAdvances: numberValue("activeAdvances"), approvalAuthority: draft["approvalAuthority"], status: draft["status"] }),
      expenses: () => ({ id, projectId: draft["projectId"], site: draft["site"], supervisor: draft["supervisor"], date: draft["date"], description: draft["description"], type: draft["type"], received: numberValue("received"), spent: numberValue("spent"), reference: draft["reference"], status: draft["status"] }),
      payments: () => ({ id, projectId: draft["projectId"], date: draft["date"], amount: numberValue("amount"), mode: draft["mode"], receipt: draft["receipt"], reference: draft["reference"], collectedBy: draft["collectedBy"], status: draft["status"] }),
    };
    return builders[module]();
  }

  private updateSignal(module: EditableModule, updater: (rows: any[]) => any[]) {
    const map = {
      materials: this.data.materials,
      vendors: this.data.vendors,
      subcontract: this.data.subcontractors,
      labours: this.data.labour,
      supervisors: this.data.supervisors,
      expenses: this.data.expenses,
      payments: this.data.payments,
    } as const;
    if (module === "clients") return;
    map[module].update((rows: any[]) => updater(rows));
  }

  private nextId(module: EditableModule): string {
    const prefixes: Record<EditableModule, string> = { clients: "CL", materials: "MAT", vendors: "VEN", subcontract: "SUB", labours: "LAB", supervisors: "SUP", expenses: "EXP", payments: "PAY" };
    const source: Record<EditableModule, Array<{ id: string }>> = {
      clients: this.data.clients(),
      materials: this.data.materials(),
      vendors: this.data.vendors(),
      subcontract: this.data.subcontractors(),
      labours: this.data.labour(),
      supervisors: this.data.supervisors(),
      expenses: this.data.expenses(),
      payments: this.data.payments(),
    };
    const next = Math.max(0, ...source[module].map((row) => Number(row.id.replace(/\D/g, ""))).filter(Number.isFinite)) + 1;
    return `${prefixes[module]}-${String(next).padStart(3, "0")}`;
  }

  private downloadFile(filename: string, type: string, content: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private projectById(projectId: string): Project | undefined {
    return this.data.projectById(projectId);
  }

  private filterLabourCategory(rows: LabourRow[]): LabourRow[] {
    const category = this.labourCategoryFilter().trim().toLowerCase();
    if (category === "all") return rows;
    return rows.filter((row) => row.category.toLowerCase() === category);
  }

  private filterRows<T>(rows: T[], pick: (row: T) => Array<string | number | undefined>, pickStatus?: (row: T) => string | undefined): T[] {
    const query = this.searchText().trim().toLowerCase();
    const status = this.statusFilter().trim().toLowerCase();
    return rows.filter((row) => {
      const values = pick(row).map((value) => String(value ?? "").toLowerCase());
      const rowStatus = String(pickStatus?.(row) ?? "").toLowerCase();
      const matchesQuery = !query || values.some((value) => value.includes(query));
      const matchesStatus = status === "all" || rowStatus === status || (status !== "active" && rowStatus.includes(status));
      return matchesQuery && matchesStatus;
    });
  }
}
