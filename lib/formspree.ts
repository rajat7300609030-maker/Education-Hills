
/**
 * Utility to submit form data to Formspree.
 * Used for "Checkout" style logging of students, fees, and expenses.
 */
export const submitToFormspree = async (formName: string, data: any) => {
  try {
    const response = await fetch('https://formspree.io/f/xnjaawby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `New Submission: ${formName}`,
        form_type: formName,
        submitted_at: new Date().toLocaleString(),
        ...data
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Formspree submission error:', error);
    return false;
  }
};
