type ChatbotReply = {
  answer: string;
  action?: "request_email";
};

const faqReplies: Array<{ patterns: RegExp[]; answer: string }> = [
  {
    patterns: [/horario/i, /abr(?:e|en)/i],
    answer: "Puedes elegir los huecos disponibles directamente en el calendario de reservas. La web solo muestra horarios que siguen libres en ese momento."
  },
  {
    patterns: [/reserv(?:a|ar|o)/i, /cita/i],
    answer: "Para reservar, elige peluquero, fecha y hora, completa tus datos y confirma la reserva."
  },
  {
    patterns: [/modific/i, /cambi/i, /anul/i, /cancel/i],
    answer: "Puedo ayudarte a gestionar tu cita. Escríbeme el email con el que la reservaste y te enviaré un enlace seguro para modificarla o anularla.",
  },
  {
    patterns: [/correo/i, /email/i, /mensaje/i],
    answer: "Tras confirmar una cita, el sistema solicita el envío de un correo con los datos de la reserva y el enlace privado para gestionarla."
  },
  {
    patterns: [/calendario/i],
    answer: "Después de reservar puedes añadir la cita al calendario desde la pantalla de confirmación o desde el enlace de gestión."
  }
];

export function getChatbotReply(message: string): ChatbotReply {
  const normalized = message.trim();
  const match = faqReplies.find((item) => item.patterns.some((pattern) => pattern.test(normalized)));

  if (match) {
    const requestsManagement = /modific|cambi|anul|cancel/i.test(normalized);
    return {
      answer: match.answer,
      action: requestsManagement ? "request_email" : undefined
    };
  }

  return {
    answer: "Puedo ayudarte a reservar, explicar cómo modificar o anular una cita, y reenviarte un enlace seguro si me das el email usado en la reserva."
  };
}
