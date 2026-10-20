// The operator's details, in one place. Every value in square brackets is a
// PLACEHOLDER that must be replaced before the legal pages are accurate; `null`
// for vatId drops that line from the Impressum (Kleinunternehmer, § 19 UStG).
import { INBOX } from "@/app/lib/inquiry";
import type { Locale } from "@/i18n/routing";

export const OPERATOR = {
  name: "alva moor",
  street: "Lausitzer Straße 10",
  city: "10999 Berlin",
  email: INBOX,
  inquiryRetention: "12 Monate",
};

const LAST_UPDATED = "2026-10-20";

function lastUpdated(locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(LAST_UPDATED));
}

export type Section = { heading: string; body: string[] };
export type LegalDocument = { title: string; sections: Section[] };

const o = OPERATOR;

function impressum(locale: Locale): LegalDocument {
  if (locale === "de") {
    return {
      title: "Impressum",
      sections: [
        {
          heading: "Angaben gemäß § 5 DDG",
          body: [`${o.name}\n${o.street}\n${o.city}`],
        },
        {
          heading: "Kontakt",
          body: [`E-Mail: ${o.email}`],
        },
        {
          heading: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
          body: [`${o.name}\n${o.street}\n${o.city}`],
        },
      ],
    };
  }
  return {
    title: "Legal notice",
    sections: [
      {
        heading: "Information pursuant to § 5 DDG (Germany)",
        body: [`${o.name}\n${o.street}\n${o.city}`],
      },
      {
        heading: "Contact",
        body: [`Email: ${o.email}`],
      },
      {
        heading: "Responsible for content under § 18 (2) MStV",
        body: [`${o.name}\n${o.street}\n${o.city}`],
      },
    ],
  };
}

function datenschutz(locale: Locale): LegalDocument {
  if (locale === "de") {
    return {
      title: "Datenschutzerklärung",
      sections: [
        {
          heading: "Verantwortliche",
          body: [
            `${o.name}, ${o.street}, ${o.city}\nE-Mail: ${o.email}`,
            "Diese Website enthält keine Analyse- oder Tracking-Werkzeuge und keine Werbung.",
          ],
        },
        {
          heading: "Hosting und Server-Logs (Cloudflare)",
          body: [
            "Die Website läuft auf der Infrastruktur von Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA (Cloudflare Workers, R2, KV; Auslieferung über das Cloudflare-Netzwerk). Beim Aufruf verarbeitet Cloudflare technisch notwendige Verbindungsdaten, insbesondere die IP-Adresse, Datum und Uhrzeit, die aufgerufene Adresse, den Browsertyp und den Referrer, um die Seite auszuliefern, Angriffe abzuwehren und den Betrieb zu sichern.",
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen Betrieb). Eine Übermittlung in die USA stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework bzw. auf Standardvertragsklauseln.",
          ],
        },
        {
          heading: "Cookies und lokale Speicherung",
          body: [
            "Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt. Folgende Informationen werden auf Ihrem Gerät gespeichert:",
            "NEXT_LOCALE (Cookie, 1 Jahr): merkt sich die gewählte Sprache, damit die Startseite in dieser Sprache geöffnet wird. Sie wird nur gesetzt, wenn Ihre Sprachwahl von der Spracheinstellung Ihres Browsers abweicht.",
            "cf_clearance (Cookie von Cloudflare, bis zu 1 Jahr): wird gesetzt, nachdem Sie eine Sicherheitsprüfung von Cloudflare bestanden haben, damit diese nicht bei jedem Aufruf wiederholt wird. Er dient dem Schutz vor automatisierten Zugriffen.",
            "alvamoor:field-nudged.2 (lokaler Speicher): vermerkt, dass die kurze Einführungsanimation auf der Startseite bereits gezeigt wurde. Der Eintrag enthält keine personenbezogenen Daten und wird nicht an den Server übertragen. Sie können ihn jederzeit in den Browsereinstellungen löschen.",
            "Rechtsgrundlage für die Speicherung der ersten beiden Einträge ist § 25 Abs. 2 Nr. 2 TDDDG (unbedingt erforderlich für den gewünschten Dienst bzw. dessen Sicherheit), für die anschließende Verarbeitung Art. 6 Abs. 1 lit. f DSGVO.",
          ],
        },
        {
          heading: "Anfragen zu Werken",
          body: [
            "Wenn Sie über das Anfrageformular schreiben, verarbeiten wir Ihre E-Mail-Adresse, Ihre Nachricht und das angefragte Werk. Die Anfrage wird per E-Mail an die Künstlerin weitergeleitet und nur verwendet, um Ihnen zu antworten. Dasselbe gilt, wenn Sie direkt eine E-Mail schreiben.",
            `Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen auf Ihre Anfrage), hilfsweise lit. f. Wir speichern die Korrespondenz ${o.inquiryRetention} und löschen sie danach, sofern keine gesetzliche Aufbewahrungspflicht besteht oder ein Kauf zustande kommt. Die E-Mails laufen über Cloudflare Email Routing und werden an das private Postfach der Künstlerin weitergeleitet.`,
          ],
        },
        {
          heading: "Spamschutz (Cloudflare Turnstile)",
          body: [
            "Das Anfrageformular nutzt Cloudflare Turnstile, um automatisierte Eingaben zu erkennen. Das Skript wird erst geladen, wenn Sie das Formular öffnen. Dabei werden Ihre IP-Adresse und Browserdaten an Cloudflare übermittelt und dort geprüft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Schutz vor Missbrauch), für die Speicherung auf Ihrem Gerät § 25 Abs. 2 Nr. 2 TDDDG.",
          ],
        },
        {
          heading: "Externe Links",
          body: [
            "Der Link zu Instagram öffnet die Seite von Meta Platforms. Erst mit dem Klick werden Daten an Instagram übertragen; es gilt dann deren Datenschutzerklärung. Auf dieser Website sind keine Inhalte von Instagram eingebettet.",
          ],
        },
        {
          heading: "Ihre Rechte",
          body: [
            "Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Wenden Sie sich dazu an die oben genannte E-Mail-Adresse.",
            `Außerdem können Sie sich bei einer Datenschutzaufsichtsbehörde beschweren.`,
          ],
        },
        { heading: "Stand", body: [lastUpdated(locale)] },
      ],
    };
  }
  return {
    title: "Privacy notice",
    sections: [
      {
        heading: "Controller",
        body: [
          `${o.name}, ${o.street}, ${o.city}\nEmail: ${o.email}`,
          "This website uses no analytics or tracking tools and shows no advertising.",
        ],
      },
      {
        heading: "Hosting and server logs (Cloudflare)",
        body: [
          "The site runs on the infrastructure of Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA (Cloudflare Workers, R2, KV; delivery through the Cloudflare network). When you visit, Cloudflare processes the connection data needed to deliver the page, in particular your IP address, date and time, the requested address, browser type and referrer, in order to serve the site, fend off attacks and keep it running.",
          "The legal basis is Art. 6(1)(f) GDPR (legitimate interest in secure and stable operation). Transfers to the USA rely on the EU-US Data Privacy Framework adequacy decision or standard contractual clauses.",
        ],
      },
      {
        heading: "Cookies and local storage",
        body: [
          "No cookies are set for analytics or advertising. The following is stored on your device:",
          "NEXT_LOCALE (cookie, 1 year): remembers the language you chose so the home page opens in it. It is only set when your choice differs from your browser's language setting.",
          "cf_clearance (cookie from Cloudflare, up to 1 year): set after you pass a Cloudflare security check, so the check is not repeated on every visit. It protects against automated access.",
          "alvamoor:field-nudged.2 (local storage): records that the short intro animation on the home page has already been shown. It holds no personal data and is never sent to the server. You can delete it at any time in your browser settings.",
          "The legal basis for storing the first two is § 25(2) no. 2 TDDDG (strictly necessary for the service you requested or its security), and for the processing that follows, Art. 6(1)(f) GDPR.",
        ],
      },
      {
        heading: "Inquiries about works",
        body: [
          "If you write through the inquiry form, we process your email address, your message and the work you asked about. The inquiry is forwarded by email to the artist and used only to reply to you. The same applies if you email directly.",
          `The legal basis is Art. 6(1)(b) GDPR (steps prior to a contract at your request), alternatively (f). We keep the correspondence for ${o.inquiryRetention} and then delete it, unless a legal retention duty applies or a purchase follows. Emails pass through Cloudflare Email Routing and are forwarded to the artist's private mailbox).`,
        ],
      },
      {
        heading: "Spam protection (Cloudflare Turnstile)",
        body: [
          "The inquiry form uses Cloudflare Turnstile to detect automated submissions. The script loads only when you open the form. Your IP address and browser data are sent to Cloudflare and checked there. The legal basis is Art. 6(1)(f) GDPR (protection against abuse), and for storage on your device § 25(2) no. 2 TDDDG.",
        ],
      },
      {
        heading: "External links",
        body: [
          "The Instagram link opens the page of Meta Platforms. Data is sent to Instagram only once you click, and their privacy policy then applies. No Instagram content is embedded on this site.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You have the right to access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on legitimate interests (Art. 21). Contact the email address above.",
          `You can also complain to a data protection authority.`,
        ],
      },
      { heading: "Last updated", body: [lastUpdated(locale)] },
    ],
  };
}

export const LEGAL_PAGES = ["impressum", "datenschutz"] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

export function legalDocument(page: LegalPage, locale: Locale): LegalDocument {
  return page === "impressum" ? impressum(locale) : datenschutz(locale);
}
