const SPREADSHEET_ID = '1sC17PuMiYVNy1dXH25AhcUvfatRvTbr9T5Ef6UYae18';
const SHEET_NAME = 'Contatos';

function doPost(e) {
  try {
    const data = parseRequestData(e);
    if (!data.nome || !data.email || !data.assunto || !data.mensagem) {
      return jsonResponse('Dados incompletos', 'Por favor, preencha todos os campos obrigatórios.', 400);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    const timestamp = new Date();
    sheet.appendRow([
      timestamp,
      data.nome,
      data.email,
      data.assunto,
      data.mensagem
    ]);

    return jsonResponse(
      'Mensagem enviada!',
      'Obrigado! Sua mensagem foi recebida e entraremos em contato em breve.',
      200
    );
  } catch (err) {
    console.error(err);
    return jsonResponse(
      'Erro',
      'Ocorreu um erro ao enviar sua mensagem. Tente novamente ou envie um e-mail diretamente.',
      500
    );
  }
}

function parseRequestData(e) {
  if (!e || !e.postData) {
    return {};
  }

  const contentType = (e.postData.type || '').toLowerCase();
  if (contentType.indexOf('application/x-www-form-urlencoded') === -1) {
    return {}
  }

  return {
    nome: e.parameter["nome"],
    email: e.parameter["email"],
    assunto: e.parameter["assunto"],
    mensagem: e.parameter["mensagem"]
  }
}

function jsonResponse(title, message, statusCode) {
  const body = JSON.stringify({ title: title, message: message, statusCode: statusCode });
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
