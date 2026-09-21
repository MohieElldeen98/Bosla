/**
 * Script to add the LHB-AC joint article to the blog database.
 * Run with: npx tsx scripts/add-lhb-ac-article.ts
 */

import { ArticleService } from "@/blog/services/article.service";

const articleContent = {
  language: "ar",
  title: "ألم الكتف عند لاعب الـ Bodybuilding: عندما يكون Speed's وYergason's وCross-Body كلهم positive",
  excerpt:
    "شاب بيرفع من سنين، والاختبارات كلها positive... يبقى دي حالة واحدة ولا حالتين؟ دليل عملي لتشخيص وعلاج ألم الكتف الأمامي عند لاعبي كمال الأجسام",
  body: `<h2>مقدمة من الواقع الإكلينيكي</h2>
<p>شاب جاك في العيادة، يقول: "أنا بأرفع من 5 سنين، والبنش والـ dips كانت حياتي. بس من شهرين الألم بدأ في الكتف الأمامي، وأنا مش عارف دي إيه بالظبط."</p>
<p>تفحصته، وكل اختبار اطلعت positive:</p>
<ul>
<li><strong>Speed's test positive:</strong> بيشاور على Long Head of Biceps</li>
<li><strong>Yergason's positive:</strong> تأكيد ثاني للـ LHB</li>
<li><strong>Cross-Body Adduction positive:</strong> بيشاور على AC joint</li>
</ul>
<p>السؤال اللي بيفكر فيه كل دكتور في الموقف ده: <strong>حالة واحدة ولا حالتين؟</strong></p>

<h2>القصة الحقيقية وراء الاختبارات</h2>
<h3>الـ 3 Tests بتقول إيه؟</h3>
<ul>
<li><strong>Speed's و Yergason's positive:</strong> بيشاوروا مع بعض على مشكلة في Long Head of Biceps (LHB). Speed's بيحمّل الـ tendon مع shoulder flexion وelbow extension. Yergason's بيحمّله بشكل مختلف مع resisted supination. لو الاتنين positive ومعاهم tenderness في الـ bicipital groove، الأرجح إننا نتكلم عن LHB tendinopathy.</li>
<li><strong>Cross-Body Adduction positive:</strong> دي اختبار لـ AC joint، لكنها مش خاصة بيه. ممكن تطلع positive كمان مع posterior capsule tightness أو الـ subacromial pain. فما نعتمدش عليها لوحدها.</li>
</ul>

<h3>الفرضية الأقرب عند Bodybuilder</h3>
<p>في الأغلب الأحيان، الحالة دي مش واحدة أو اتنين، لكن <strong>اتنين مع بعض في نفس الوقت</strong>:</p>
<ul>
<li><strong>LHB tendinopathy:</strong> الـ tendon شايل حمل أكتر ممكن يتحمل</li>
<li><strong>AC joint irritation أو osteolysis:</strong> المفصل الصغير اللي على قمة الكتف بدأ يحط ضغط</li>
</ul>
<p>الاتنين بيتجمعوا عنده لنفس السبب الحقيقي: البرنامج التدريبي.</p>

<h3>لماذا بيحصل ده عند Bodybuilder بالتحديد؟</h3>
<p>الـ bench العميق، والـ dips، والـ flyes بيحطوا الكتف الأمامي تحت ضغط عالي في وضعية horizontal abduction مع extension. ودي في نفس الوقت:</p>
<ol>
<li>بيدوس على الـ AC joint</li>
<li>بيشد الـ LHB في الـ groove</li>
<li>بتضعف scapular control من كثرة الـ pushing</li>
</ol>
<p>وعندما scapular control تضعف مع التعب، الحمل بيتوزع غلط. النتيجة: الاتنين بيوجعوا في نفس الوقت.</p>

<h2>إزاي نأكد التشخيص؟</h2>
<h3>1. Palpation — اختبر بإيدك</h3>
<p>دي أهم حاجة. اسأل المريض: "شاور بصباع واحد على مكان الألم بالظبط."</p>
<ul>
<li>لو الألم في الـ <strong>bicipital groove</strong>: وبتتحرك النقطة مع rotation الكتف، ده LHB.</li>
<li>لو الألم على الـ <strong>AC joint مباشرة</strong> (فوق الكتف): اضغط على الـ clavicle والـ acromion، هنلاقي tenderness واضحة.</li>
</ul>

<h3>2. الـ Specialized Tests</h3>
<ul>
<li><strong>O'Brien's test:</strong> الألم الأعلى بيوجّه للـ AC. الألم الأعمق بيفكرنا في SLAP.</li>
<li><strong>AC Resisted Extension:</strong> بتأكد تأثر الـ AC.</li>
<li><strong>Subscapularis tests (Lift-off و Belly Press):</strong> لأن الـ LHB instability والـ pulley lesions غالبًا بتجيء مع subscapularis problem.</li>
<li><strong>Apprehension و Relocation:</strong> لو في microinstability، ده ممكن يفسر الـ LHB overload.</li>
</ul>

<h3>3. الـ History — اسأل الصح</h3>
<p>كل سؤال من اللي دول بيقول لك حاجة:</p>
<ul>
<li>عرض الـ grip والـ bench كم؟ والـ dips عمقها كام؟</li>
<li>الألم بظهر في أسفل الحركة ولا في الـ lockout؟</li>
<li>الـ volume زاد فجأة؟ ولا كان تدريجي؟</li>
<li>الـ pressing والـ pulling متوازنين في البرنامج؟</li>
<li>الألم بدأ بعد تمرين معين (ثقيل جدًا أو حركة جديدة)؟</li>
<li>بيستخدم anabolic steroids؟ (اسأل بدون أحكام - ده مهم لأنه بيؤثر على الـ tendon capacity)</li>
<li>الألم بيصحيه بالليل؟</li>
</ul>

<h3>4. Imaging — متى نطلبها</h3>
<ul>
<li><strong>X-ray:</strong> مفيد جدًا هنا! بتشوف الـ distal clavicle osteolysis: osteopenia، cystic changes، أو widening في الـ AC joint.</li>
<li><strong>MRI:</strong> لو الشك في SLAP أو subscapularis tear أو pulley lesion، أو لو مفيش استجابة للعلاج بعد 6-8 أسابيع.</li>
<li><strong>Ultrasound:</strong> بتقيّم الـ tendon والـ fluid ودي حساسة للـ dynamic assessment.</li>
</ul>

<h3>Red Flags — متى تحول للـ Orthopedic فوري؟</h3>
<ul>
<li>Popeye sign (proximal biceps rupture)</li>
<li>ضعف واضح في subscapularis</li>
<li>Instability واضحة أو mechanical locking</li>
<li>مفيش تحسن بعد 8-12 أسبوع من تأهيل مضبوط</li>
</ul>

<h2>العلاج: خطة واقعية</h2>
<h3>المبدأ الأساسي</h3>
<p><strong>ما توقفوش عن التمرين نهائيًا.</strong> الراحة الكاملة بتضعف الـ tendon capacity وبتخليك في حالة أسوأ لما ترجع.</p>
<p>الخطة: <strong>تعديل الحمل + رجوع تدريجي.</strong></p>

<h3>المرحلة 1: تهدئة الأعراض (أسبوع 0-2)</h3>
<h4>تعديل التمرين الفوري</h4>
<ul>
<li><strong>الـ AC joint:</strong> أوقف مؤقتًا الـ dips والـ flyes والـ bench العميق. استبدلهم بـ:
<ul>
<li>Neutral grip dumbbell press</li>
<li>Floor press</li>
<li>Board press</li>
<li>Incline خفيف</li>
</ul>
</li>
<li><strong>الـ LHB:</strong> قلّل الـ heavy pulling والـ curls الثقيلة. تجنب الـ end-range stretch مع shoulder extension.</li>
<li><strong>الـ Overhead:</strong> استبدل الـ overhead press العادي بـ landmine press أو scaption.</li>
</ul>

<h4>قاعدة الألم</h4>
<p>مسموح 3-4/10 أثناء التمرين <strong>بشرط يرجع لمستواه الطبيعي خلال 24 ساعة.</strong> لو زاد بعد يومين، أنت بتحمّل أكتر ممكن.</p>

<h4>تمارين التهدئة</h4>
<ul>
<li><strong>Isometric exercises للـ LHB والـ cuff:</strong> shoulder flexion isometric و elbow flexion isometric و external rotation، 5 مرات × 30-45 ثانية لكل مرة.</li>
<li><strong>Scapular setting:</strong> low trapezius و serratus بحمل خفيف.</li>
<li><strong>Thoracic extension mobility و posterior shoulder stretch</strong> لو فيه tightness.</li>
<li><strong>Pec minor release أو stretch</strong> لو قصير - ده بيساهم في scapular dyskinesis.</li>
</ul>

<h3>المرحلة 2: بناء الـ Capacity (أسبوع 2-6)</h3>
<h4>Heavy Slow Resistance للـ LHB</h4>
<ul>
<li>Curls و rows بـ tempo بطيء: 3-4 ثواني لفوق، 3-4 ثواني لتحت</li>
<li>3-4 sets × 6-12 reps</li>
<li>زود الأحمال تدريجيًا حسب التحمل</li>
</ul>

<h4>Rotator Cuff Endurance</h4>
<ul>
<li>خصوصًا الـ subscapularis والـ external rotators</li>
<li>15-20 reps بحمل خفيف لمتوسط</li>
<li>أوضاع مختلفة: standing, quadruped, prone</li>
</ul>

<h4>Scapular Strength</h4>
<ul>
<li>Rows بأنواعها</li>
<li>Face pulls</li>
<li>Y-raises</li>
<li>Serratus punches</li>
<li>Wall slides مع resistance</li>
</ul>

<h4>الـ Pulling:Pressing Ratio</h4>
<p>أساسي جدًا! في البداية، ارفع الـ pulling عشان يوصل على الأقل لـ 1:1 (أو أكتر شوية).</p>

<h3>المرحلة 3: الرجوع للـ Heavy Training (أسبوع 6-12)</h3>
<h4>معايير التقدم</h4>
<ul>
<li>ألم أقل من 2/10 في الأنشطة العادية</li>
<li>Tests خفّت أو اختفت</li>
<li>قوة الـ cuff والـ scapular متماثلة</li>
</ul>

<h4>الترجيع التدريجي</h4>
<ol>
<li>أولًا: زوّد الـ load</li>
<li>ثانيًا: زوّد الـ depth</li>
<li>ثالثًا: زوّد الـ frequency</li>
</ol>

<h4>الـ Dips والـ Flyes</h4>
<p>آخر حاجة ترجع، وفي الغالب بـ range محدود. بعض لاعبين بيفضلوا شالها نهائيًا وبديل يساعدهم أكتر.</p>

<h4>الوقاية الدائمة</h4>
<ul>
<li>Pull:push ratio متوازنة طول الوقت</li>
<li>Warm-up للـ cuff والـ scapula قبل أي pressing</li>
<li>Deload weeks مضبوطة</li>
</ul>

<h2>لو الحالة عاندت (بعد 8-12 أسبوع من التأهيل الصحيح)</h2>
<h3>الـ AC Joint</h3>
<ul>
<li><strong>Corticosteroid injection:</strong> ممكن يساعد في تخفيف الألم مؤقتًا، خصوصًا في المرحلة الحادة.</li>
<li><strong>Distal clavicle resection:</strong> لو الـ osteolysis مقاوم وفيه functional disability واضح.</li>
</ul>

<h3>الـ LHB</h3>
<ul>
<li><strong>Ultrasound-guided injection في الـ sheath:</strong> خيار قبل الجراحة.</li>
<li><strong>Tenotomy أو Tenodesis:</strong> نادرة، وبتتناقش مع orthopedic في الحالات المقاومة أو المصحوبة بـ SLAP.</li>
</ul>

<h3>نقطة مهمة جدًا</h3>
<p><strong>الـ Injection مش بديل للتأهيل.</strong> دي حاجة بتساعد في تخفيف الألم عشان تقدر تقوم بالتأهيل بشكل أفضل. التأهيل هو اللي بيحل المشكلة.</p>

<h2>نصايح مهمة للمريض</h2>
<ul>
<li><strong>الألم مش عدو:</strong> هو إشارة نسمعها ونضبط بيها الحمل. لما تتعلم تسمع الإشارة بتاعتك، بتقدر تضبط بتاعتك.</li>
<li><strong>الرجوع بياخد وقت:</strong> أسابيع، مش أيام. والـ tendon والـ AC بيرجعوا أبطأ من العضل.</li>
<li><strong>التقدم مش بس قلة الألم:</strong> بيتقاس بالقدرة على التحميل والـ strength.</li>
<li><strong>لو بتستخدم anabolics:</strong> ناقش مع دكتورك تأثيره على الـ tendon. أحيانًا بتاخد فترة راحة ممكن تساعد أكتر ممكن تتوقع.</li>
</ul>

<h2>الخلاصة الإكلينيكية</h2>
<p>عندك عادةً:</p>
<ol>
<li><strong>LHB tendinopathy</strong> (شبه أكيد)</li>
<li><strong>AC joint irritation أو osteolysis</strong> (معها في 90% من الحالات)</li>
<li>أحيانًا <strong>عامل تالت</strong> زي microinstability أو subscapularis involvement</li>
</ol>
<p><strong>لكن الـ Driver الحقيقي؟ البرنامج التدريبي والـ movement pattern.</strong></p>
<p>الـ Tendon والمفصل بيتحملوا نفس الـ load اللي واصلهم لكده. وعلاج واحد منهم من غير تعديل الـ program يعني الـ tendon أو المفصل التاني هيرجع يوجع تاني.</p>
<p>الحل في الاتنين مع بعض، ومع تغيير الحمل اللي وصّلهم لكده.</p>`,
  references: [],
  isFeatured: false,
  publish: true,
};

async function main() {
  try {
    console.log("Adding article to blog...");
    const result = await ArticleService.create({
      ...articleContent,
      references: articleContent.references || [],
    });

    if ("data" in result) {
      console.log("✅ Article added successfully!");
      console.log("Article ID:", result.data.id);
      console.log("Article slug:", result.data.slug);
      console.log("Article title:", result.data.title);
    } else {
      console.error("❌ Failed to add article:", result);
    }
  } catch (error) {
    console.error("Error adding article:", error);
    process.exit(1);
  }
}

main();
