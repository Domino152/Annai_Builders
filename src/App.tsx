import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { IonApp, IonIcon, IonModal, IonToggle } from '@ionic/react';
import {
  arrowBackOutline,
  bagHandleOutline,
  cardOutline,
  cashOutline,
  checkmarkCircle,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  heart,
  paperPlaneOutline,
  pencilOutline,
  qrCodeOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
  walletOutline
} from 'ionicons/icons';

import brandLogo from './assets/brand-logo.png';
import brandMark from './assets/brand-mark.png';
import homeLogo from './assets/home-logo.png';
import demoQr from './assets/demo-qr.png';
import bannerDigiGold from './assets/banner-digigold.png';
import bannerDigiSilver from './assets/banner-digisilver.png';
import bannerMagicGold from './assets/banner-magic-gold.png';

type TabKey = 'plans' | 'news' | 'home' | 'payments' | 'profile';
type ViewKey = TabKey | 'schemes';
type SchemeKind = 'Gold' | 'Silver';
type ProfileData = {
  name: string;
  phone: string;
  email: string;
  dob: string;
  maritalStatus: string;
  branch: string;
  line1: string;
  line2: string;
  state: string;
};

const navItems: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: 'plans', icon: cashOutline, label: 'My Plans' },
  { key: 'news', icon: documentTextOutline, label: 'News Feed' },
  { key: 'home', icon: storefrontOutline, label: 'Home' },
  { key: 'payments', icon: walletOutline, label: 'Payments' },
  { key: 'profile', icon: settingsOutline, label: 'Profile' }
];

const promoSlides = [
  { title: 'Digi Gold', subtitle: 'Flexible gold savings', tone: 'rose' },
  { title: 'Magic Gold Plan', subtitle: "Father's golden future", tone: 'gold' },
  { title: 'Digi Silver', subtitle: 'Simple silver savings', tone: 'teal' }
];

const defaultProfile: ProfileData = {
  name: 'Sherwin',
  phone: '8438343292',
  email: 'sherwinaniesh@gmail.com',
  dob: 'May 25, 2026',
  maritalStatus: 'Single',
  branch: 'Select One',
  line1: '',
  line2: '',
  state: 'Select State'
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>('home');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [rateRotation, setRateRotation] = useState(0);
  const [schemeKind, setSchemeKind] = useState<SchemeKind>('Gold');
  const [profile, setProfile] = useState(defaultProfile);
  const [draftProfile, setDraftProfile] = useState(defaultProfile);
  const [showQr, setShowQr] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [hasReferral, setHasReferral] = useState(true);
  const [hasPromo, setHasPromo] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % promoSlides.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRateRotation((current) => current + 180);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const activeTab: TabKey = activeView === 'schemes' ? 'home' : activeView;

  const screen = useMemo(() => {
    if (activeView === 'plans') {
      return <PlansScreen onJoin={() => setActiveView('schemes')} />;
    }

    if (activeView === 'news') {
      return <NewsScreen />;
    }

    if (activeView === 'payments') {
      return <PaymentsScreen />;
    }

    if (activeView === 'schemes') {
      return (
        <SchemesScreen
          kind={schemeKind}
          onKindChange={setSchemeKind}
          onJoin={(kind) => {
            setSchemeKind(kind);
            setShowJoin(true);
          }}
        />
      );
    }

    if (activeView === 'profile') {
      return (
        <ProfileScreen
          profile={profile}
          onEdit={() => {
            setDraftProfile(profile);
            setShowEdit(true);
          }}
        />
      );
    }

    return (
      <HomeScreen
        bannerIndex={bannerIndex}
        onBannerPick={setBannerIndex}
        onQr={() => setShowQr(true)}
        onJoin={() => {
          setSchemeKind('Gold');
          setActiveView('schemes');
        }}
        onPlans={() => setActiveView('plans')}
        onPayments={() => setActiveView('payments')}
        rateRotation={rateRotation}
        onRateRotate={(delta) => setRateRotation((current) => current + delta)}
      />
    );
  }, [activeView, bannerIndex, profile, rateRotation, schemeKind]);

  return (
    <IonApp>
      <div className="mobile-shell">
        {showSplash ? (
          <SplashScreen />
        ) : (
          <>
            <main className="screen-scroll">{screen}</main>
            <BottomTabs activeTab={activeTab} onChange={setActiveView} />
          </>
        )}

        <IonModal
          isOpen={showQr}
          onDidDismiss={() => setShowQr(false)}
          initialBreakpoint={0.68}
          breakpoints={[0, 0.68, 0.92]}
          className="app-sheet qr-sheet"
        >
          <div className="sheet-body">
            <SheetHeader title="QR Code" onClose={() => setShowQr(false)} back />
            <div className="qr-card">
              <h2>{profile.name}</h2>
              <img className="demo-qr" src={demoQr} alt="Demo QR code for Annai Jewellers" />
              <p>{profile.phone}</p>
            </div>
          </div>
        </IonModal>

        <IonModal
          isOpen={showJoin}
          onDidDismiss={() => setShowJoin(false)}
          initialBreakpoint={0.94}
          breakpoints={[0, 0.94]}
          className="app-sheet join-sheet"
        >
          <div className="sheet-body join-body">
            <SheetHeader title={schemeKind === 'Gold' ? 'DIGI GOLD' : 'DIGI SILVER'} onClose={() => setShowJoin(false)} />
            <section className="join-intro">
              <h2>{schemeKind === 'Gold' ? 'DIGI GOLD' : 'DIGI SILVER'}</h2>
              <h3>(Variable Amount)</h3>
              <p>
                Annai Jewellers {schemeKind === 'Gold' ? 'DIGI GOLD' : 'DIGI SILVER'} is a savings scheme that is
                exclusively for savings and easy monthly joining.
              </p>
            </section>
            <label className="terms-row">
              <span>
                I agree with the <a>Terms and Conditions</a>
              </span>
              <button
                type="button"
                className={termsAccepted ? 'check-button active' : 'check-button'}
                onClick={() => setTermsAccepted((value) => !value)}
                aria-label="Accept terms and conditions"
              >
                <IonIcon icon={checkmarkCircle} />
              </button>
            </label>
            <FormField label="Joiner's Name" placeholder="Eg. Ajith" required />
            <FormField label="Amount" placeholder="Eg. Rs 100" required />
            <ToggleRow label="Have referral code?" checked={hasReferral} onChange={setHasReferral} />
            {hasReferral && <FormField label="Referral code" placeholder="Eg. AGI412" clearable />}
            <ToggleRow label="Apply Promo Code" checked={hasPromo} onChange={setHasPromo} />
            {hasPromo && <FormField label="Promo Code" placeholder="Eg. PROMO100" />}
            <button className="pay-button" type="button">
              Pay & Join
            </button>
          </div>
        </IonModal>

        <IonModal
          isOpen={showEdit}
          onDidDismiss={() => setShowEdit(false)}
          initialBreakpoint={0.88}
          breakpoints={[0, 0.88, 0.97]}
          className="app-sheet edit-sheet"
        >
          <div className="sheet-body edit-body">
            <SheetHeader title="Edit Profile" actionLabel="Cancel" onClose={() => setShowEdit(false)} />
            <section className="form-card">
              <FormField label="Name" value={draftProfile.name} onChange={(name) => setDraftProfile({ ...draftProfile, name })} />
              <FormField label="Phone" value={draftProfile.phone} onChange={(phone) => setDraftProfile({ ...draftProfile, phone })} />
              <FormField label="Email" value={draftProfile.email} onChange={(email) => setDraftProfile({ ...draftProfile, email })} />
              <FormField label="Date of Birth" value={draftProfile.dob} onChange={(dob) => setDraftProfile({ ...draftProfile, dob })} />
              <FormField
                label="Marital Status"
                value={draftProfile.maritalStatus}
                onChange={(maritalStatus) => setDraftProfile({ ...draftProfile, maritalStatus })}
              />
              <FormField label="Branch" value={draftProfile.branch} onChange={(branch) => setDraftProfile({ ...draftProfile, branch })} />
            </section>
            <section className="form-card">
              <h3>
                Address Information <span>*</span>
              </h3>
              <FormField label="Line 1" value={draftProfile.line1} onChange={(line1) => setDraftProfile({ ...draftProfile, line1 })} required />
              <FormField label="Line 2" value={draftProfile.line2} onChange={(line2) => setDraftProfile({ ...draftProfile, line2 })} required />
              <FormField label="State" value={draftProfile.state} onChange={(state) => setDraftProfile({ ...draftProfile, state })} required />
            </section>
            <button
              className="save-button"
              type="button"
              onClick={() => {
                setProfile(draftProfile);
                setShowEdit(false);
              }}
            >
              Save Changes
            </button>
          </div>
        </IonModal>
      </div>
    </IonApp>
  );
}

function SplashScreen() {
  return (
    <div className="splash-screen">
      <img src={brandLogo} alt="Annai Jewellers" />
    </div>
  );
}

function TopBar({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <header className="top-bar">
      <h1>{title}</h1>
      {onEdit && (
        <button type="button" className="header-icon" aria-label="Edit profile" onClick={onEdit}>
          <IonIcon icon={pencilOutline} />
        </button>
      )}
    </header>
  );
}

function HomeScreen({
  bannerIndex,
  onBannerPick,
  onQr,
  onJoin,
  onPlans,
  onPayments,
  rateRotation,
  onRateRotate
}: {
  bannerIndex: number;
  onBannerPick: (index: number) => void;
  onQr: () => void;
  onJoin: () => void;
  onPlans: () => void;
  onPayments: () => void;
  rateRotation: number;
  onRateRotate: (delta: number) => void;
}) {
  return (
    <>
      <TopBar title="Annai Jewellers" />
      <section className="dashboard-panel">
        <div className="welcome-row">
          <img src={brandMark} alt="" />
          <div>
            <span>Welcome</span>
            <strong>Sherwin</strong>
          </div>
          <button type="button" className="qr-button" onClick={onQr} aria-label="Open QR code">
            <IonIcon icon={qrCodeOutline} />
          </button>
        </div>
        <PromoCarousel active={bannerIndex} onPick={onBannerPick} />
        <CarouselDots count={promoSlides.length} active={bannerIndex} onPick={onBannerPick} />
      </section>

      <RateBlock rotation={rateRotation} onRotate={onRateRotate} />

      <section className="quick-actions" aria-label="Primary actions">
        <ActionButton label="My Plans" icon={cardOutline} onClick={onPlans} />
        <ActionButton label="Join Plan" icon={bagHandleOutline} onClick={onJoin} />
        <ActionButton label="Payments" icon={walletOutline} onClick={onPayments} />
      </section>

      <section className="spotlight-section">
        <h2>Spotlight</h2>
        <PlaceholderMedia title="Spotlight" subtitle="Video placeholder" large />
        <CarouselDots count={5} active={3} compact />
      </section>
    </>
  );
}

function PromoCarousel({ active, onPick }: { active: number; onPick: (index: number) => void }) {
  return (
    <div className="banner-stage" aria-label="Dashboard image slider">
      <div className="promo-carousel">
        {promoSlides.map((slide, index) => {
          const offset = (index - active + promoSlides.length) % promoSlides.length;
          const position = offset === 0 ? 'active' : offset === 1 ? 'next' : 'previous';

          return (
            <button
              key={slide.title}
              type="button"
              className={`promo-slide ${position} ${slide.tone}`}
              onClick={() => onPick(index)}
              aria-label={`Show ${slide.title}`}
            >
              <img src={brandMark} alt="" />
              <span>{slide.title}</span>
              <strong>{slide.subtitle}</strong>
              <small>Placeholder Image</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RateBlock({ rotation, onRotate }: { rotation: number; onRotate: (delta: number) => void }) {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const displayRotation = rotation + dragDelta * 0.55;

  const finishDrag = () => {
    if (dragStart === null) {
      return;
    }

    if (Math.abs(dragDelta) > 24) {
      onRotate(dragDelta > 0 ? 180 : -180);
    } else {
      onRotate(180);
    }

    setDragStart(null);
    setDragDelta(0);
  };

  return (
    <section className="rate-section">
      <h2>Gold & Silver Rate</h2>
      <div
        className={dragStart === null ? 'rate-flip' : 'rate-flip dragging'}
        aria-live="polite"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onRotate(180);
          }
        }}
        onPointerDown={(event) => {
          setDragStart(event.clientX);
          setDragDelta(0);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart !== null) {
            setDragDelta(event.clientX - dragStart);
          }
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="rate-flip-inner" style={{ transform: `rotateY(${displayRotation}deg)` }}>
          <RateCard type="silver" />
          <RateCard type="gold" back />
        </div>
      </div>
    </section>
  );
}

function RateCard({ type, back }: { type: 'gold' | 'silver'; back?: boolean }) {
  const isGold = type === 'gold';

  return (
    <article className={isGold ? 'rate-card gold' : 'rate-card silver'}>
      <div>
        <span>{isGold ? 'GOLD RATE:' : 'SILVER RATE:'}</span>
        <small>{isGold ? '22K Per Gram' : 'Per Gram'}</small>
      </div>
      <div className="rate-value">
        <strong>{isGold ? <>&#8377;14,320</> : <>&#8377;290</>}</strong>
        <small>(0%)</small>
      </div>
      {back && <span className="sr-only">Gold rate side</span>}
    </article>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" className="action-button" onClick={onClick}>
      <span>
        <IonIcon icon={icon} />
      </span>
      {label}
    </button>
  );
}

function SchemesScreen({
  kind,
  onKindChange,
  onJoin
}: {
  kind: SchemeKind;
  onKindChange: (kind: SchemeKind) => void;
  onJoin: (kind: SchemeKind) => void;
}) {
  const cards =
    kind === 'Gold'
      ? [
          { image: bannerMagicGold, title: 'Magic Gold Plan', meta: '22K gold savings' },
          { image: bannerDigiGold, title: 'Digi Gold', meta: 'Variable monthly amount' }
        ]
      : [{ image: bannerDigiSilver, title: 'Digi Silver', meta: 'Silver savings plan' }];

  return (
    <>
      <TopBar title="Our Schemes" />
      <div className="segment-control" role="tablist" aria-label="Scheme type">
        {(['Gold', 'Silver'] as SchemeKind[]).map((item) => (
          <button
            key={item}
            type="button"
            className={kind === item ? 'active' : ''}
            onClick={() => onKindChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="scheme-list">
        {cards.map((card) => (
          <button key={card.title} type="button" className="scheme-card" onClick={() => onJoin(kind)}>
            <img src={card.image} alt={card.title} />
            <span>
              <strong>{card.title}</strong>
              <small>{card.meta}</small>
            </span>
            <IonIcon icon={chevronForwardOutline} />
          </button>
        ))}
      </section>
    </>
  );
}

function PlansScreen({ onJoin }: { onJoin: () => void }) {
  return (
    <>
      <TopBar title="My Plans" />
      <section className="plans-content">
        <article className="empty-plans-card">
          <img src={brandMark} alt="" />
          <strong>No Current Plans</strong>
          <p>You do not have an active scheme right now.</p>
          <button type="button" onClick={onJoin}>
            Join Plan
          </button>
        </article>
      </section>
    </>
  );
}

function PaymentsScreen() {
  const paymentLogs = [
    { title: 'Digi Gold Plan', amount: 'Rs 1,000', date: 'May 25, 2026', status: 'Completed' },
    { title: 'Magic Gold Plan', amount: 'Rs 500', date: 'Apr 25, 2026', status: 'Completed' },
    { title: 'Digi Silver Plan', amount: 'Rs 250', date: 'Mar 25, 2026', status: 'Completed' }
  ];

  return (
    <>
      <TopBar title="Payments" />
      <section className="payment-log">
        {paymentLogs.map((payment) => (
          <article className="payment-log-card" key={`${payment.title}-${payment.date}`}>
            <div>
              <span>{payment.title}</span>
              <strong>{payment.amount}</strong>
            </div>
            <div>
              <small>{payment.date}</small>
              <em>{payment.status}</em>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function NewsScreen() {
  const posts = [
    {
      date: 'Mar 25',
      caption: 'Shine Brighter With Sparkling Diamond Jewellery! Visit Annai Jewellers Today.',
      likes: 335,
      shares: 361
    },
    {
      date: 'Mar 25',
      caption: 'New designs are ready for your next celebration.',
      likes: 110,
      shares: 44
    }
  ];

  return (
    <>
      <TopBar title="News Feed" />
      <section className="news-feed">
        {posts.map((post, index) => (
          <article className="news-item" key={`${post.date}-${post.likes}`}>
            <div className="news-date">
              <span>
                <img src={brandMark} alt="" />
              </span>
              <strong>{post.date}</strong>
            </div>
            <div className="news-card">
              <div className="media-placeholder">
                <img src={brandMark} alt="" />
              </div>
              <p>{post.caption}</p>
              <div className="engagement-row">
                <span>
                  <IonIcon icon={heart} />
                  {post.likes} likes
                </span>
                <span>
                  <IonIcon icon={paperPlaneOutline} />
                  {post.shares} shares
                </span>
              </div>
            </div>
            {index === 0 && <span className="timeline-dot" />}
          </article>
        ))}
      </section>
    </>
  );
}

function PlaceholderMedia({
  title,
  subtitle,
  tone = 'rose',
  large
}: {
  title: string;
  subtitle: string;
  tone?: string;
  large?: boolean;
}) {
  return (
    <div className={`placeholder-media ${tone}${large ? ' large' : ''}`}>
      <img src={brandMark} alt="" />
      <span>{title}</span>
      <strong>{subtitle}</strong>
    </div>
  );
}

function ProfileScreen({ profile, onEdit }: { profile: ProfileData; onEdit: () => void }) {
  const rows = [
    ['Connect', storefrontOutline],
    ['Security', shieldCheckmarkOutline],
    ['Privacy', settingsOutline],
    ['About', documentTextOutline],
    ['Logout', arrowBackOutline]
  ];

  return (
    <section className="profile-screen">
      <TopBar title="Profile" onEdit={onEdit} />
      <div className="profile-hero">
        <div className="avatar" />
      </div>
      <div className="profile-panel">
        <h2>{profile.name}</h2>
        <p>{profile.phone}</p>
        <p>DOB: {profile.dob}</p>
        <p>E-Mail: {profile.email}</p>
        {profile.branch !== 'Select One' && <p>Branch: {profile.branch}</p>}
        <button type="button" className="profile-edit-button" onClick={onEdit}>
          <IonIcon icon={pencilOutline} />
          Edit Profile
        </button>
        <div className="profile-menu">
          {rows.map(([label, icon]) => (
            <button key={label} type="button">
              <span>
                <IonIcon icon={icon} />
                {label}
              </span>
              <IonIcon icon={chevronForwardOutline} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomTabs({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="bottom-tabs" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={activeTab === item.key ? 'active' : ''}
          onClick={() => onChange(item.key)}
          aria-label={item.label}
        >
          {item.key === 'home' ? <img src={homeLogo} alt="" /> : <IonIcon icon={item.icon} />}
        </button>
      ))}
    </nav>
  );
}

function SheetHeader({
  title,
  actionLabel,
  back,
  onClose
}: {
  title: string;
  actionLabel?: string;
  back?: boolean;
  onClose: () => void;
}) {
  return (
    <header className="sheet-header">
      <button type="button" aria-label={back ? 'Back' : 'Close'} onClick={onClose}>
        <IonIcon icon={back ? arrowBackOutline : closeOutline} />
      </button>
      <h2>{title}</h2>
      {actionLabel ? (
        <button type="button" className="sheet-action" onClick={onClose}>
          {actionLabel}
        </button>
      ) : (
        <span />
      )}
    </header>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  required,
  clearable
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  clearable?: boolean;
}) {
  const inputProps = onChange
    ? {
        value: value ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)
      }
    : {
        defaultValue: value
      };

  return (
    <label className="field-row">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      <div>
        <input {...inputProps} placeholder={placeholder} />
        {clearable && (
          <button type="button" aria-label="Clear field" onClick={() => onChange?.('')}>
            <IonIcon icon={closeOutline} />
          </button>
        )}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  compact,
  required
}: {
  label: string;
  value: string;
  compact?: boolean;
  required?: boolean;
}) {
  return (
    <button type="button" className={compact ? 'select-row compact' : 'select-row'}>
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      <strong>{value}</strong>
      <IonIcon icon={chevronForwardOutline} />
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <IonToggle checked={checked} onIonChange={(event) => onChange(event.detail.checked)} />
    </div>
  );
}

function CarouselDots({
  count,
  active,
  compact,
  onPick
}: {
  count: number;
  active: number;
  compact?: boolean;
  onPick?: (index: number) => void;
}) {
  return (
    <div className={compact ? 'carousel-dots compact' : 'carousel-dots'}>
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={active === index ? 'active' : ''}
          onClick={() => onPick?.(index)}
          aria-label={`Show slide ${index + 1}`}
        />
      ))}
    </div>
  );
}

export default App;
