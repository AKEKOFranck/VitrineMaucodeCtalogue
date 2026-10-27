'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  FaWhatsapp,
  FaPlus,
  FaMinus,
  FaXmark,
  FaBagShopping,
  FaCopy,
  FaCheck,
} from 'react-icons/fa6';
import client from '../data/client.json';
import styles from './page.module.css';

const MAUCODE_URL = 'https://maucode-web.vercel.app/';
const MAX_QTY = 20;
const COOLDOWN_MS = 15000;

const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} ${client.currency}`;

// Nettoie un texte saisi : retire caractères de contrôle et chevrons, limite la longueur.
const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

// Numéro ivoirien : 10 chiffres, avec ou sans +225.
const normalizePhone = (v) =>
  String(v ?? '')
    .replace(/[\s.\-()]/g, '')
    .replace(/^(\+|00)?225/, '');

export default function Page() {
  const [splash, setSplash] = useState(true);
  const [cat, setCat] = useState('Tout');
  const [cart, setCart] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', mode: 'livraison', address: '', note: '', hp: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastSent, setLastSent] = useState(0);

  // Animation de lancement (une fois par session)
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('splash') === '1';
    } catch {}
    const t = setTimeout(() => {
      setSplash(false);
      try {
        sessionStorage.setItem('splash', '1');
      } catch {}
    }, seen ? 0 : 2600);
    return () => clearTimeout(t);
  }, []);

  // Fermer le formulaire avec Échap
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const categories = useMemo(() => ['Tout', ...new Set(client.products.map((p) => p.category))], []);
  const products = cat === 'Tout' ? client.products : client.products.filter((p) => p.category === cat);

  const items = client.products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] }));
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const change = (id, delta) =>
    setCart((c) => {
      const next = Math.min((c[id] || 0) + delta, MAX_QTY);
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const orderNow = (id) => {
    if (!cart[id]) change(id, 1);
    setDone(null);
    setOpen(true);
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (clean(form.name, 60).length < 2) e.name = 'Entrez votre nom.';
    if (!/^\d{10}$/.test(normalizePhone(form.phone))) e.phone = 'Entrez un numéro à 10 chiffres.';
    if (form.mode === 'livraison' && clean(form.address, 140).length < 3) e.address = 'Indiquez votre quartier ou adresse.';
    if (!items.length) e.cart = 'Votre panier est vide.';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (form.hp) return; // champ piège anti-robot
    if (Date.now() - lastSent < COOLDOWN_MS) {
      setErrors({ cart: 'Patientez quelques secondes avant un nouvel envoi.' });
      return;
    }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    // Les prix viennent uniquement du fichier JSON, jamais du formulaire.
    const num = `CMD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const date = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const name = clean(form.name, 60);
    const phone = normalizePhone(form.phone);
    const note = clean(form.note, 200);
    const msg = [
      `🧾 *FACTURE ${num}*`,
      `${client.name} | ${date}`,
      '',
      `*Client* : ${name}`,
      `*Téléphone* : +225 ${phone}`,
      form.mode === 'livraison' ? `*Livraison* : ${clean(form.address, 140)}` : '*Retrait sur place*',
      '',
      ...items.map((i) => `• ${i.name} x${i.qty} = ${fcfa(i.qty * i.price)}`),
      '',
      `*TOTAL : ${fcfa(total)}*`,
      note ? `\n*Note* : ${note}` : '',
      '',
      'Merci de confirmer ma commande 🙏',
    ].join('\n');

    const waNumber = String(client.whatsapp).replace(/\D/g, '');
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

    setLastSent(Date.now());
    setDone({ num, msg, url });
    setCart({});

    // Tentative d'ouverture automatique. Si elle est bloquée,
    // le client utilise le bouton « Ouvrir WhatsApp » de l'écran suivant.
    try {
      window.open(url, '_blank');
    } catch {}
  };

  const copyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(done.msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={styles.page} style={{ '--brand': client.theme.primary, '--brand-soft': client.theme.soft }}>
      {splash && (
        <div className={styles.splash} aria-hidden="true">
          <Image src="/LogoMC.png" alt="" width={112} height={112} className={styles.splashIcon} priority />
          <p className={styles.splashName}>{client.name}</p>
          <div className={styles.splashBar}><span /></div>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.container + ' ' + styles.headerRow}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>{client.name.charAt(0)}</span>
            <div>
              <h1 className={styles.brandName}>{client.name}</h1>
              <p className={styles.brandTag}>{client.tagline}</p>
            </div>
          </div>
          <button className={styles.cartBtn} onClick={() => { setDone(null); setOpen(true); }} aria-label={`Ouvrir le panier, ${count} article(s)`}>
            <FaBagShopping aria-hidden="true" />
            <span>Panier</span>
            {count > 0 && <b className={styles.badge}>{count}</b>}
          </button>
        </div>
      </header>

      <section className={styles.heroBand}>
        <div className={styles.container + ' ' + styles.hero}>
          <h2>Commandez en toute simplicité sur WhatsApp</h2>
          <p>{client.slogan}</p>
          <a href="#catalogue" className={styles.heroCta}>Voir le catalogue</a>
        </div>
      </section>

      <main className={styles.container} id="catalogue">
        <div className={styles.chips} role="tablist" aria-label="Catégories">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? styles.chipOn : styles.chip} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        <ul className={styles.grid}>
          {products.map((p) => (
            <li key={p.id} className={styles.card}>
              <div className={styles.thumb} aria-hidden="true">{p.emoji}</div>
              <div className={styles.cardBody}>
                <h3>{p.name}</h3>
                {p.description && <p className={styles.desc}>{p.description}</p>}
                <p className={styles.price}>{fcfa(p.price)}</p>
              </div>
              <button className={styles.orderBtn} onClick={() => orderNow(p.id)}>Commander</button>
            </li>
          ))}
        </ul>

        <p className={styles.delivery}>{client.deliveryNote}</p>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container + ' ' + styles.footerRow}>
          <Image src="/LogoMC.png" alt="Logo Maucode" width={64} height={64} className={styles.footLogo} />
          <p>
            Site créé par <a href={MAUCODE_URL} target="_blank" rel="noopener noreferrer"><strong>Maucode</strong></a>, le digital autrement.
            <br />
            Sites vitrines, catalogues en ligne et applications pour les petits commerces.
          </p>
        </div>
      </footer>

      {count > 0 && !open && (
        <button className={styles.floatBar} onClick={() => { setDone(null); setOpen(true); }}>
          <span>{count} article{count > 1 ? 's' : ''}</span>
          <strong>{fcfa(total)}</strong>
          <span className={styles.floatGo}>Voir le panier</span>
        </button>
      )}

      {open && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="order-title">
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Fermer"><FaXmark /></button>

            {done ? (
              <div className={styles.success}>
                <span className={styles.check}><FaCheck /></span>
                <h2 id="order-title">Facture {done.num} prête</h2>
                <p>Appuyez sur le bouton ci-dessous pour ouvrir WhatsApp, puis sur Envoyer pour transmettre votre facture au vendeur.</p>

                <a className={styles.primary} href={done.url} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden="true" /> Ouvrir WhatsApp
                </a>

                <button className={styles.secondary} onClick={copyInvoice}>
                  <FaCopy aria-hidden="true" /> {copied ? 'Copié' : 'Copier la facture'}
                </button>
                <button className={styles.secondary} onClick={() => setOpen(false)}>Fermer</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 id="order-title">Votre commande</h2>

                <ul className={styles.lines}>
                  {items.length === 0 && <li className={styles.empty}>Choisissez un produit dans le catalogue.</li>}
                  {items.map((i) => (
                    <li key={i.id}>
                      <span>{i.emoji} {i.name}</span>
                      <div className={styles.qty}>
                        <button type="button" onClick={() => change(i.id, -1)} aria-label={`Retirer un ${i.name}`}><FaMinus /></button>
                        <b>{i.qty}</b>
                        <button type="button" onClick={() => change(i.id, 1)} aria-label={`Ajouter un ${i.name}`}><FaPlus /></button>
                      </div>
                      <em>{fcfa(i.qty * i.price)}</em>
                    </li>
                  ))}
                </ul>
                <p className={styles.total}>Total <strong>{fcfa(total)}</strong></p>
                {errors.cart && <p className={styles.err} role="alert">{errors.cart}</p>}

                <label>Nom
                  <input value={form.name} onChange={setField('name')} maxLength={60} autoComplete="name" placeholder="Votre nom" />
                  {errors.name && <span className={styles.err}>{errors.name}</span>}
                </label>
                <label>Téléphone
                  <input value={form.phone} onChange={setField('phone')} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="07 00 00 00 00" />
                  {errors.phone && <span className={styles.err}>{errors.phone}</span>}
                </label>

                <div className={styles.modes}>
                  <label><input type="radio" name="mode" checked={form.mode === 'livraison'} onChange={() => setForm((f) => ({ ...f, mode: 'livraison' }))} /> Livraison</label>
                  <label><input type="radio" name="mode" checked={form.mode === 'retrait'} onChange={() => setForm((f) => ({ ...f, mode: 'retrait' }))} /> Retrait sur place</label>
                </div>

                {form.mode === 'livraison' && (
                  <label>Adresse de livraison
                    <input value={form.address} onChange={setField('address')} maxLength={140} placeholder="Quartier, rue, repère" />
                    {errors.address && <span className={styles.err}>{errors.address}</span>}
                  </label>
                )}

                <label>Remarque (facultatif)
                  <textarea value={form.note} onChange={setField('note')} maxLength={200} rows={2} placeholder={client.notePlaceholder} />
                </label>

                {/* Champ piège : invisible pour les humains, rempli par les robots */}
                <input className={styles.trap} tabIndex={-1} autoComplete="new-password" aria-hidden="true" value={form.hp} onChange={setField('hp')} name="hp_field" />

                <button type="submit" className={styles.primary}>
                  <FaWhatsapp aria-hidden="true" /> Envoyer la facture sur WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}