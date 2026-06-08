import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { IonContent, IonSplitPane } from "@ionic/angular/standalone";
import type { Project } from "../../data/dashboardData";
import { ErpDataService, type SharedModuleKey, type SharedTableRow } from "../data/erp-data.service";
import { EnterpriseHeaderComponent } from "../shared/enterprise-header.component";
import { EnterpriseSidebarComponent } from "../shared/enterprise-sidebar.component";
import { formatMoney } from "../shared/format";

type ApprovalRow = {
  rowId: string;
  module: SharedModuleKey;
  field: "status" | "approvalStatus";
  type: string;
  title: string;
  client: string;
  project: string;
  site: string;
  amount: string;
  submittedBy: string;
  status: string;
  date: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, IonContent, IonSplitPane, EnterpriseHeaderComponent, EnterpriseSidebarComponent],
  template: `
    <ion-split-pane contentId="main-content" when="lg">
      <agb-enterprise-sidebar active="approvals"></agb-enterprise-sidebar>

      <div class="ion-page" id="main-content">
        <agb-enterprise-header
          title="Pending Approvals"
          eyebrow="Approval Queue"
          metaLabel=""
          [showTitle]="false"
          searchPlaceholder="Search approvals..."
        />

        <ion-content class="erp-page">
          <main class="workspace-shell approvals-shell">
            <section class="approval-command-strip">
              <div>
                <span>Project Manager Review</span>
                <h1>Pending Approvals</h1>
                <p>Approve or decline site, material, labour, payment, and subcontractor items from one queue.</p>
              </div>
              <div class="approval-summary-grid">
                <div><span>Pending Items</span><strong>{{ approvalRows().length }}</strong></div>
                <div><span>Clients</span><strong>{{ pendingClientCount() }}</strong></div>
                <div><span>Projects</span><strong>{{ pendingProjectCount() }}</strong></div>
              </div>
            </section>

            <section class="operations-workbench approvals-workbench">
              <div class="module-toolbar table-first-toolbar">
                <div>
                  <h2>Review Queue</h2>
                  <p>Only records marked pending appear here. Approved or declined rows leave the queue automatically.</p>
                </div>
              </div>

              <div class="table-wrap operations-table approvals-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Record</th>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Site</th>
                      <th>Amount / Qty</th>
                      <th>Submitted By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of approvalRows()">
                      <td>{{ row.type }}</td>
                      <td><strong>{{ row.title }}</strong></td>
                      <td>{{ row.client || "-" }}</td>
                      <td>{{ row.project || "-" }}</td>
                      <td>{{ row.site || "-" }}</td>
                      <td>{{ row.amount || "-" }}</td>
                      <td>{{ row.submittedBy || "-" }}</td>
                      <td>{{ row.date || "-" }}</td>
                      <td><span class="approval-status-pill">{{ row.status }}</span></td>
                      <td class="approval-actions">
                        <button type="button" class="approve-action" (click)="approve(row)" aria-label="Approve item">
                          <svg viewBox="0 0 20 20" aria-hidden="true" class="svg-icon">
                            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                          </svg>
                          Approve
                        </button>
                        <button type="button" class="decline-action" (click)="decline(row)" aria-label="Decline item">
                          <svg viewBox="0 0 20 20" aria-hidden="true" class="svg-icon">
                            <path d="m5.5 5.5 9 9" />
                            <path d="m14.5 5.5-9 9" />
                          </svg>
                          Decline
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="approvalRows().length === 0">
                      <td class="empty-row" colspan="10">
                        <div class="empty-record-state icon-only" aria-label="No pending approvals">
                          <span class="empty-box-icon" aria-hidden="true">
                            <svg viewBox="0 0 226.512 226.512" aria-hidden="true">
                              <path class="empty-box-fill" d="M186.268 9.011H38.929c-6.005 0-13.189 4.536-16.116 10.128L3.009 65.958C.822 71.549-.461 80.932.153 86.909l12.287 119.774c.609 5.978 5.983 10.818 11.988 10.818h177.672c6.005 0 11.379-4.846 11.988-10.818l12.287-119.774c.609-5.978-.87-15.273-3.312-20.755l-21.414-47.238c-2.491-5.472-8.377-9.905-14.381-9.905Z" />
                              <path class="empty-box-line" d="M28.834 68.514l6.88-20.201c1.936-5.684 8.376-10.296 14.386-10.296h122.896c6.005 0 12.863 4.444 15.311 9.932l9.361 20.935c2.448 5.488-.435 9.932-6.445 9.932H36.209c-6.01 0-9.311-4.612-7.375-10.302Z" />
                              <path class="empty-box-line" d="M78.362 102.383h69.799c6.005 0 10.878 4.873 10.878 10.878v24.476c0 6.005-4.873 10.878-10.878 10.878H78.362c-6.005 0-10.878-4.873-10.878-10.878v-24.476c0-6.005 4.873-10.878 10.878-10.878Z" />
                            </svg>
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </ion-content>
      </div>
    </ion-split-pane>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingApprovalsPage {
  private readonly data = inject(ErpDataService);

  readonly approvalRows = computed(() => this.buildApprovalRows().filter((row) => this.isPending(row.status)));

  pendingClientCount(): number {
    return new Set(this.approvalRows().map((row) => row.client).filter(Boolean)).size;
  }

  pendingProjectCount(): number {
    return new Set(this.approvalRows().map((row) => row.project).filter(Boolean)).size;
  }

  approve(row: ApprovalRow) {
    this.data.updateSharedRowCell(row.rowId, row.field, "Approve");
  }

  decline(row: ApprovalRow) {
    this.data.updateSharedRowCell(row.rowId, row.field, "Decline");
  }

  private buildApprovalRows(): ApprovalRow[] {
    return [
      ...this.materialRows(),
      ...this.labourRows(),
      ...this.siteExpenseRows(),
      ...this.generalExpenseRows(),
      ...this.paymentRows(),
      ...this.subcontractRows(),
    ];
  }

  private materialRows(): ApprovalRow[] {
    const rows = this.data.materials().map((row) => {
      const project = this.projectById(row.projectId);
      return {
        __rowId: `material:${row.id}`,
        client: project?.client ?? "",
        project: project?.name ?? row.projectId,
        site: row.site,
        title: row.name,
        amount: `${row.approved || row.requested} ${row.unit}`,
        submittedBy: row.vendor,
        date: "2026-06-05",
        status: row.status,
      };
    });
    return this.data.tableRowsFor("materials", rows).map((row) => this.toApprovalRow(row, "materials", "status", "Material"));
  }

  private labourRows(): ApprovalRow[] {
    const rows = this.data.labour().map((row) => {
      const project = this.projectById(row.projectId);
      return {
        __rowId: `labour:${row.id}`,
        client: project?.client ?? "",
        project: project?.name ?? row.projectId,
        site: row.site,
        title: row.party,
        amount: `${row.presentCount} staff`,
        submittedBy: row.paymentMode,
        date: "2026-06-05",
        status: row.status,
      };
    });
    return this.data.tableRowsFor("labour", rows).map((row) => this.toApprovalRow(row, "labour", "status", "Labour"));
  }

  private siteExpenseRows(): ApprovalRow[] {
    const rows = this.data
      .expenses()
      .filter((row) => row.type === "Site Expense")
      .map((row) => {
        const project = this.projectById(row.projectId);
        return {
          __rowId: `expense:${row.id}`,
          client: project?.client ?? "",
          project: project?.name ?? row.projectId,
          site: row.site,
          title: row.description,
          amount: formatMoney(row.spent),
          submittedBy: row.supervisor,
          date: row.date,
          approvalStatus: row.status,
        };
      });
    return this.data.tableRowsFor("expenses", rows).map((row) => this.toApprovalRow(row, "expenses", "approvalStatus", "Site Expense"));
  }

  private generalExpenseRows(): ApprovalRow[] {
    const rows = this.data
      .expenses()
      .filter((row) => row.type === "General Expense")
      .map((row) => ({
        __rowId: `general-expense:${row.id}`,
        client: "Company",
        project: "Head Office",
        site: "Office",
        title: row.description,
        amount: formatMoney(row.spent),
        submittedBy: row.supervisor,
        date: row.date,
        approvalStatus: row.status,
      }));
    return this.data.tableRowsFor("generalExpenses", rows).map((row) => this.toApprovalRow(row, "generalExpenses", "approvalStatus", "General Expense"));
  }

  private paymentRows(): ApprovalRow[] {
    const rows = this.data.payments().map((row) => {
      const project = this.projectById(row.projectId);
      return {
        __rowId: `payment:${row.id}`,
        client: project?.client ?? "",
        project: project?.name ?? row.projectId,
        site: "",
        title: row.receipt,
        amount: formatMoney(row.amount),
        submittedBy: row.collectedBy,
        date: row.date,
        approvalStatus: row.status,
      };
    });
    return this.data.tableRowsFor("payments", rows).map((row) => this.toApprovalRow(row, "payments", "approvalStatus", "Payment"));
  }

  private subcontractRows(): ApprovalRow[] {
    const rows = this.data.subcontractors().map((row) => {
      const project = this.projectById(row.projectId);
      return {
        __rowId: `subcontractor:${row.id}`,
        client: project?.client ?? "",
        project: project?.name ?? row.projectId,
        site: row.site,
        title: row.name,
        amount: formatMoney(row.contractValue - row.advancePaid),
        submittedBy: row.supervisor,
        date: row.startDate,
        approvalStatus: row.approvalStatus,
      };
    });
    return this.data.tableRowsFor("subcontractors", rows).map((row) => this.toApprovalRow(row, "subcontractors", "approvalStatus", "Subcontract"));
  }

  private toApprovalRow(row: SharedTableRow, module: SharedModuleKey, field: "status" | "approvalStatus", type: string): ApprovalRow {
    return {
      rowId: String(row["__rowId"] || ""),
      module,
      field,
      type,
      title: String(row["title"] || row["description"] || row["name"] || "Record"),
      client: String(row["client"] || ""),
      project: String(row["project"] || ""),
      site: String(row["site"] || ""),
      amount: String(row["amount"] || ""),
      submittedBy: String(row["submittedBy"] || ""),
      status: String(row[field] || row["status"] || "Pending"),
      date: String(row["date"] || ""),
    };
  }

  private projectById(projectId: string): Project | undefined {
    return this.data.projectById(projectId);
  }

  private isPending(value: string): boolean {
    return value.toLowerCase() === "pending";
  }
}
