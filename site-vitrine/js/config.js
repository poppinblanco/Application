/**
 * ============================================================
 *  PERSONNALISATION DU SITE — modifiez uniquement ce fichier
 * ============================================================
 * Toutes les infos du salon, les tarifs, la boutique et les avis
 * sont regroupés ici. Le reste du site (HTML/CSS/JS) n'a pas
 * besoin d'être touché : il se met à jour automatiquement.
 *
 * Marqué "// TODO" = à remplacer par vos vraies informations.
 */

const CONFIG = {
  business: {
    name: 'Raïssagasy Coiffure',
    tagline: 'Coiffeuse à domicile et en institut',
    bio: "Passionnée par la coiffure depuis plus de 10 ans, je vous accueille dans un cadre chaleureux "
       + "pour prendre soin de vos cheveux : coupes, colorations, soins et coiffures d'évènement. "
       + "Je me déplace aussi à domicile sur demande. Chaque prestation est personnalisée selon votre "
       + "nature de cheveux et vos envies.", // TODO : adaptez avec votre propre texte et votre zone de déplacement à domicile
    photo: '', // TODO : mettez 'assets/photos/portrait.jpg' une fois votre photo ajoutée dans ce dossier
    specialties: ['Colorimétrie', 'Coupe femme & homme', 'Coiffure de mariage', 'Soins capillaires'], // TODO

    address: 'Avenue de Saint-Antoine, 13015 Marseille', // TODO : ajoutez le numéro de rue si vous voulez une localisation plus précise sur la carte
    phone: '07 51 85 58 58',
    email: 'raissounamous@gmail.com',
    whatsapp: '33751855858', // même numéro que "phone" ; mettez '' pour masquer le bouton WhatsApp si ce numéro n'a pas WhatsApp
    instagram: '', // TODO : lien complet, ex. https://instagram.com/raissa.coiffure
    facebook: '', // TODO

    // Horaires d'ouverture. Laissez ranges: [] pour un jour fermé.
    hours: [
      { day: 'Lundi',    ranges: [['09:00', '23:00']] },
      { day: 'Mardi',    ranges: [['09:00', '23:00']] },
      { day: 'Mercredi', ranges: [['09:00', '23:00']] },
      { day: 'Jeudi',    ranges: [['09:00', '23:00']] },
      { day: 'Vendredi', ranges: [['09:00', '23:00']] },
      { day: 'Samedi',   ranges: [['09:00', '23:00']] },
      { day: 'Dimanche', ranges: [['09:00', '23:00']] }
    ]
  },

  // Laissez vide pour utiliser l'envoi par e-mail (mailto) automatique.
  // Pour recevoir les demandes proprement dans votre boîte mail sans ouvrir
  // le logiciel de messagerie du client : créez un compte gratuit sur
  // https://formspree.io, créez un formulaire, et collez son URL ici,
  // ex: 'https://formspree.io/f/abcdwxyz'
  formspreeEndpoint: '',

  // Prestations & tarifs, regroupées par catégorie.
  services: [
    {
      category: 'Coupe & brushing',
      items: [
        { name: 'Coupe femme', duration: 45, price: 35 },
        { name: 'Coupe homme', duration: 30, price: 22 },
        { name: 'Coupe enfant (- 12 ans)', duration: 30, price: 18 },
        { name: 'Brushing', duration: 30, price: 25 }
      ]
    },
    {
      category: 'Coloration',
      items: [
        { name: 'Coloration racines', duration: 60, price: 45 },
        { name: 'Coloration complète', duration: 90, price: 65 },
        { name: 'Balayage', duration: 120, price: 85 },
        { name: 'Mèches', duration: 105, price: 75 }
      ]
    },
    {
      category: 'Soins',
      items: [
        { name: 'Soin hydratant', duration: 20, price: 15 },
        { name: 'Soin protéiné', duration: 30, price: 22 }
      ]
    },
    {
      category: 'Coiffure événementielle',
      items: [
        { name: 'Chignon soirée', duration: 60, price: 55 },
        { name: 'Coiffure mariée (essai inclus)', duration: 120, price: 120 }
      ]
    }
  ], // TODO : remplacez par vos vraies prestations et tarifs

  // Produits vendus en boutique (retrait en institut / paiement à la confirmation).
  products: [
    { id: 'p1', name: 'Shampoing sans sulfate', price: 18, image: '', description: 'Nettoie en douceur, préserve la couleur.' },
    { id: 'p2', name: 'Masque nutrition intense', price: 24, image: '', description: 'Répare et nourrit les cheveux secs.' },
    { id: 'p3', name: 'Huile capillaire', price: 20, image: '', description: 'Brillance et anti-frisottis.' },
    { id: 'p4', name: 'Spray thermo-protecteur', price: 16, image: '', description: 'Protège du lisseur et du sèche-cheveux.' }
  ], // TODO : remplacez par vos vrais produits

  testimonials: [
    { name: 'Sarah L.', rating: 5, text: 'Toujours un plaisir, à l’écoute et un vrai résultat professionnel !' },
    { name: 'Marie D.', rating: 5, text: 'Ma coloration est parfaite, je recommande les yeux fermés.' },
    { name: 'Inès K.', rating: 5, text: 'Coiffure de mariage magnifique, merci pour votre patience et votre talent.' }
  ] // TODO : remplacez par vos vrais avis (avec l'accord de vos clientes)
};
