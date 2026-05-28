insert into language_assets (language_code, asset_key, asset_value)
values
  ('hi', 'greeting', 'Namaste, main UDS ki taraf se call kar raha/rahi hoon.'),
  ('hi', 'context', 'Aapke location par machine pickup ya de-installation request ke baare mein baat karni thi.'),
  ('hi', 'readiness_question', 'Kya machine abhi aapke paas hai aur pickup ya engineer visit ke liye ready hai?'),
  ('hi', 'positive_close', 'Dhanyavaad, hum engineer dispatch ke liye status update kar denge.'),
  ('hi', 'negative_follow_up', 'Theek hai, kripya bataiye kab callback karna behtar rahega.'),
  ('en', 'greeting', 'Hello, I am calling from UDS.'),
  ('en', 'context', 'I am calling about the machine pickup or de-installation request for your location.'),
  ('en', 'readiness_question', 'Can you confirm whether the machine is with you and ready for pickup or engineer visit?'),
  ('en', 'positive_close', 'Thank you, we will update the status for engineer dispatch.'),
  ('en', 'negative_follow_up', 'Understood. Please share when we should call back.')
on conflict do nothing;
