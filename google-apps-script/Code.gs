// Contact form backend for src/components/sections/Contact.astro. Deployed manually as an
// Apps Script web app (see README); the site reads its URL from PUBLIC_GOOGLE_SCRIPT_URL.
//
// Request: POST application/x-www-form-urlencoded with nome, email, assunto and mensagem.
// Response: JSON { message, statusCode }. Apps Script cannot set the HTTP status, so the form
// treats a 2xx statusCode as success and shows `message` either way.

const SPREADSHEET_ID = '1sC17PuMiYVNy1dXH25AhcUvfatRvTbr9T5Ef6UYae18';
const SHEET_NAME = 'Contatos';

const MAX_LENGTH = { nome: 120, email: 254, mensagem: 5000 };
// Must match the <option> values of the "assunto" select in Contact.astro.
const SUBJECTS = ['projetos-agroflorestais', 'projetos-carbono', 'treinamentos', 'outro'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  try {
    const data = parseRequestData(e);
    const error = validationError(data);
    if (error) return jsonResponse(error, 400);

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    sheet.appendRow([
      new Date(),
      asPlainText(data.nome),
      asPlainText(data.email),
      data.assunto,
      asPlainText(data.mensagem),
    ]);

    return jsonResponse(
      'Obrigado! Sua mensagem foi recebida e entraremos em contato em breve.',
      200,
    );
  } catch (err) {
    console.error(err);
    return jsonResponse(
      'Ocorreu um erro ao enviar sua mensagem. Tente novamente ou envie um e-mail diretamente.',
      500,
    );
  }
}

function parseRequestData(e) {
  const contentType = (e && e.postData && e.postData.type) || '';
  if (contentType.toLowerCase().indexOf('application/x-www-form-urlencoded') === -1) return {};

  const field = function (name) {
    const value = e.parameter[name];
    return typeof value === 'string' ? value.trim() : '';
  };
  return {
    nome: field('nome').replace(/\s+/g, ' '),
    email: field('email'),
    assunto: field('assunto'),
    mensagem: field('mensagem'),
  };
}

/** Returns the message to show the visitor, or null when the submission is valid. */
function validationError(data) {
  if (!data.nome || !data.email || !data.assunto || !data.mensagem) {
    return 'Por favor, preencha todos os campos obrigatórios.';
  }
  if (data.nome.length > MAX_LENGTH.nome) {
    return 'O nome deve ter no máximo ' + MAX_LENGTH.nome + ' caracteres.';
  }
  if (data.email.length > MAX_LENGTH.email || !EMAIL_PATTERN.test(data.email)) {
    return 'Informe um e-mail válido.';
  }
  if (SUBJECTS.indexOf(data.assunto) === -1) {
    return 'Selecione um assunto válido.';
  }
  if (data.mensagem.length > MAX_LENGTH.mensagem) {
    return 'A mensagem deve ter no máximo ' + MAX_LENGTH.mensagem + ' caracteres.';
  }
  return null;
}

// Sheets evaluates a cell starting with = + - @ (or a tab/CR before one) as a formula, so
// visitor input is forced to text with a leading apostrophe, which Sheets does not display.
function asPlainText(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function jsonResponse(message, statusCode) {
  const body = JSON.stringify({ message: message, statusCode: statusCode });
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
