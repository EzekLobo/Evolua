package br.com.metodologia.cards

import android.app.Application
import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountTree
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.Quiz
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Source
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.IntOffset
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MetodologiaApp()
        }
    }
}

data class SourceReference(
    val pdf: String,
    val page: Int,
    val excerpt: String
)

data class Topic(
    val id: String,
    val name: String,
    val description: String
)

data class Flashcard(
    val id: String,
    val topicId: String,
    val type: String,
    val difficulty: Int,
    val front: String,
    val back: String,
    val source: SourceReference
)

data class QuizQuestion(
    val id: String,
    val topicId: String,
    val question: String,
    val options: List<String>,
    val correctOptionIndex: Int,
    val optionExplanations: List<String>,
    val explanation: String,
    val source: SourceReference
)

data class DisplayedOption(
    val text: String,
    val originalIndex: Int,
    val explanation: String,
    val isCorrect: Boolean
)

fun QuizQuestion.displayedOptions(): List<DisplayedOption> {
    return options.mapIndexed { index, option ->
        DisplayedOption(
            text = option,
            originalIndex = index,
            explanation = optionExplanations.getOrElse(index) { explanation },
            isCorrect = index == correctOptionIndex
        )
    }.shuffled()
}

data class ConceptRelation(
    val id: String,
    val topicId: String,
    val from: String,
    val to: String,
    val description: String,
    val source: SourceReference
)

data class GlossaryTerm(
    val id: String,
    val term: String,
    val definition: String,
    val topicId: String,
    val source: SourceReference
)

data class ExamPracticeQuestion(
    val id: String,
    val topicId: String,
    val prompt: String,
    val weight: String,
    val approach: String,
    val checklist: List<String>,
    val source: SourceReference
)

data class ExamModel(
    val id: String,
    val title: String,
    val focus: String,
    val duration: String,
    val questions: List<String>,
    val rubric: List<String>,
    val source: SourceReference
)

data class MaterialStudyGuide(
    val id: String,
    val pdf: String,
    val title: String,
    val purpose: String,
    val visualTree: List<String>,
    val flow: List<String>,
    val diagram: List<String>,
    val metacognition: List<String>,
    val strategies: List<String>,
    val source: SourceReference
)

data class StudyContent(
    val topics: List<Topic>,
    val flashcards: List<Flashcard>,
    val quizzes: List<QuizQuestion>,
    val relations: List<ConceptRelation>,
    val glossary: List<GlossaryTerm>,
    val examPractice: List<ExamPracticeQuestion>,
    val examModels: List<ExamModel>,
    val studyGuides: List<MaterialStudyGuide>
)

enum class Confidence(val label: String, val score: Int) {
    None("Não lembro", 0),
    Partial("Lembro parcialmente", 1),
    Explain("Consigo explicar", 2),
    Differentiate("Consigo diferenciar", 3)
}

enum class Screen(val label: String, val icon: ImageVector) {
    Home("Início", Icons.Outlined.Home),
    Study("Estudo", Icons.Outlined.AutoStories),
    Cards("Cards", Icons.Outlined.Style),
    Quiz("Quiz", Icons.Outlined.Quiz),
    Errors("Erros", Icons.Outlined.ErrorOutline),
    Relations("Relações", Icons.Outlined.AccountTree),
    Glossary("Termos", Icons.Outlined.Source),
    Exam("Treino", Icons.Outlined.EditNote),
    Prova("Prova", Icons.Outlined.Assignment)
}

enum class ExamRoundMode {
    Cards,
    Quiz
}

class StudyRepository(private val context: Context) {
    private val prefs = context.getSharedPreferences("study_progress", Context.MODE_PRIVATE)

    fun loadContent(): StudyContent {
        val raw = context.assets.open("study_content.json").bufferedReader().use { it.readText() }
        val root = JSONObject(raw)
        return StudyContent(
            topics = root.getJSONArray("topics").mapObjects {
                Topic(
                    id = getString("id"),
                    name = getString("name"),
                    description = getString("description")
                )
            },
            flashcards = root.getJSONArray("flashcards").mapObjects {
                Flashcard(
                    id = getString("id"),
                    topicId = getString("topicId"),
                    type = getString("type"),
                    difficulty = getInt("difficulty"),
                    front = getString("front"),
                    back = getString("back"),
                    source = getJSONObject("source").toSource()
                )
            },
            quizzes = root.getJSONArray("quizzes").mapObjects {
                val options = getJSONArray("options").mapStrings()
                val correctOptionIndex = getInt("correctOptionIndex")
                val explanation = getString("explanation")
                val optionExplanations = optJSONArray("optionExplanations")
                    ?.mapStrings()
                    ?.takeIf { it.size == options.size }
                    ?: options.mapIndexed { index, _ ->
                        if (index == correctOptionIndex) {
                            explanation
                        } else {
                            "Esta alternativa parece relacionada, mas não responde corretamente ao enunciado."
                        }
                    }
                QuizQuestion(
                    id = getString("id"),
                    topicId = getString("topicId"),
                    question = getString("question"),
                    options = options,
                    correctOptionIndex = correctOptionIndex,
                    optionExplanations = optionExplanations,
                    explanation = explanation,
                    source = getJSONObject("source").toSource()
                )
            },
            relations = root.getJSONArray("relations").mapObjects {
                ConceptRelation(
                    id = getString("id"),
                    topicId = getString("topicId"),
                    from = getString("from"),
                    to = getString("to"),
                    description = getString("description"),
                    source = getJSONObject("source").toSource()
                )
            },
            glossary = root.getJSONArray("glossary").mapObjects {
                GlossaryTerm(
                    id = getString("id"),
                    term = getString("term"),
                    definition = getString("definition"),
                    topicId = getString("topicId"),
                    source = getJSONObject("source").toSource()
                )
            },
            examPractice = root.getJSONArray("examPractice").mapObjects {
                ExamPracticeQuestion(
                    id = getString("id"),
                    topicId = getString("topicId"),
                    prompt = getString("prompt"),
                    weight = getString("weight"),
                    approach = getString("approach"),
                    checklist = getJSONArray("checklist").mapStrings(),
                    source = getJSONObject("source").toSource()
                )
            },
            examModels = root.getJSONArray("examModels").mapObjects {
                ExamModel(
                    id = getString("id"),
                    title = getString("title"),
                    focus = getString("focus"),
                    duration = getString("duration"),
                    questions = getJSONArray("questions").mapStrings(),
                    rubric = getJSONArray("rubric").mapStrings(),
                    source = getJSONObject("source").toSource()
                )
            },
            studyGuides = root.getJSONArray("studyGuides").mapObjects {
                MaterialStudyGuide(
                    id = getString("id"),
                    pdf = getString("pdf"),
                    title = getString("title"),
                    purpose = getString("purpose"),
                    visualTree = getJSONArray("visualTree").mapStrings(),
                    flow = getJSONArray("flow").mapStrings(),
                    diagram = getJSONArray("diagram").mapStrings(),
                    metacognition = getJSONArray("metacognition").mapStrings(),
                    strategies = getJSONArray("strategies").mapStrings(),
                    source = getJSONObject("source").toSource()
                )
            }
        )
    }

    fun snapshot(content: StudyContent): ProgressSnapshot {
        val today = LocalDate.now().toString()
        val lastDay = prefs.getString("lastDay", null)
        val streak = when {
            lastDay == today -> prefs.getInt("streak", 0)
            lastDay == null -> 0
            ChronoUnit.DAYS.between(LocalDate.parse(lastDay), LocalDate.now()) == 1L -> prefs.getInt("streak", 0)
            else -> 0
        }
        return ProgressSnapshot(
            xp = prefs.getInt("xp", 0),
            streak = streak,
            reviewedToday = prefs.getInt("reviewed_$today", 0),
            quizToday = prefs.getInt("quiz_$today", 0),
            fixedErrorsToday = prefs.getInt("fixed_$today", 0),
            weakTopicId = weakestTopic(content),
            errorCardIds = prefs.getStringSet("errors", emptySet()).orEmpty().toSet(),
            masteredCardIds = content.flashcards.mapNotNull { card ->
                if (prefs.getInt("ok_${card.id}", 0) >= 2) card.id else null
            }.toSet()
        )
    }

    fun recordCard(card: Flashcard, confidence: Confidence, correct: Boolean) {
        touchDay()
        val today = LocalDate.now().toString()
        val errors = prefs.getStringSet("errors", emptySet()).orEmpty().toMutableSet()
        val editor = prefs.edit()
        editor.putInt("reviewed_$today", prefs.getInt("reviewed_$today", 0) + 1)
        editor.putInt("xp", prefs.getInt("xp", 0) + if (correct) 12 else 6)
        editor.putInt("confidence_${card.id}", confidence.score)
        if (correct) {
            editor.putInt("ok_${card.id}", prefs.getInt("ok_${card.id}", 0) + 1)
            if (errors.remove(card.id)) {
                editor.putInt("fixed_$today", prefs.getInt("fixed_$today", 0) + 1)
            }
        } else {
            editor.putInt("miss_${card.id}", prefs.getInt("miss_${card.id}", 0) + 1)
            errors.add(card.id)
        }
        editor.putStringSet("errors", errors)
        editor.apply()
    }

    fun recordQuiz(question: QuizQuestion, correct: Boolean) {
        touchDay()
        val today = LocalDate.now().toString()
        prefs.edit()
            .putInt("quiz_$today", prefs.getInt("quiz_$today", 0) + 1)
            .putInt("xp", prefs.getInt("xp", 0) + if (correct) 10 else 4)
            .putInt("quiz_${question.id}", if (correct) 1 else -1)
            .apply()
    }

    fun resetProgress() {
        prefs.edit().clear().apply()
    }

    private fun touchDay() {
        val today = LocalDate.now()
        val lastDay = prefs.getString("lastDay", null)
        val currentStreak = prefs.getInt("streak", 0)
        val nextStreak = when {
            lastDay == today.toString() -> currentStreak.coerceAtLeast(1)
            lastDay == null -> 1
            ChronoUnit.DAYS.between(LocalDate.parse(lastDay), today) == 1L -> currentStreak + 1
            else -> 1
        }
        prefs.edit().putString("lastDay", today.toString()).putInt("streak", nextStreak).apply()
    }

    private fun weakestTopic(content: StudyContent): String? {
        return content.topics.minByOrNull { topic ->
            val topicCards = content.flashcards.filter { it.topicId == topic.id }
            if (topicCards.isEmpty()) return@minByOrNull 100
            topicCards.sumOf { prefs.getInt("ok_${it.id}", 0) - prefs.getInt("miss_${it.id}", 0) }
        }?.id
    }
}

data class ProgressSnapshot(
    val xp: Int,
    val streak: Int,
    val reviewedToday: Int,
    val quizToday: Int,
    val fixedErrorsToday: Int,
    val weakTopicId: String?,
    val errorCardIds: Set<String>,
    val masteredCardIds: Set<String>
)

class StudyViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = StudyRepository(application)
    val content: StudyContent = repository.loadContent()
    var progress by mutableStateOf(repository.snapshot(content))
        private set

    fun recordCard(card: Flashcard, confidence: Confidence, correct: Boolean) {
        repository.recordCard(card, confidence, correct)
        progress = repository.snapshot(content)
    }

    fun recordQuiz(question: QuizQuestion, correct: Boolean) {
        repository.recordQuiz(question, correct)
        progress = repository.snapshot(content)
    }

    fun resetProgress() {
        repository.resetProgress()
        progress = repository.snapshot(content)
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun MetodologiaApp(viewModel: StudyViewModel = viewModel()) {
    var screen by remember { mutableStateOf(Screen.Home) }
    var source by remember { mutableStateOf<SourceReference?>(null) }

    MaterialTheme(
        colorScheme = MaterialTheme.colorScheme.copy(
            primary = Color(0xFF1F6F68),
            secondary = Color(0xFF8A5A2B),
            surface = Color(0xFFFFFBF7),
            background = Color(0xFFF8F4EE)
        )
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            if (source != null) {
                SourceScreen(source = source!!, onBack = { source = null })
            } else {
                val bottomScreens = listOf(Screen.Home, Screen.Study, Screen.Cards, Screen.Quiz, Screen.Prova)
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = { Text(screen.label) },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        )
                    },
                    bottomBar = {
                        Surface(color = MaterialTheme.colorScheme.surface) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                bottomScreens.forEach { item ->
                                    NavigationBarItem(
                                        selected = screen == item,
                                        onClick = { screen = item },
                                        icon = { Icon(item.icon, contentDescription = item.label) },
                                        label = { Text(item.label, maxLines = 1) },
                                    )
                                }
                            }
                        }
                    }
                ) { padding ->
                    Box(modifier = Modifier.padding(padding)) {
                        when (screen) {
                            Screen.Home -> HomeScreen(
                                viewModel,
                                onStartStudy = { screen = Screen.Study },
                                onStartCards = { screen = Screen.Cards },
                                onStartQuiz = { screen = Screen.Quiz },
                                onStartExam = { screen = Screen.Prova },
                                onOpenErrors = { screen = Screen.Errors },
                                onOpenRelations = { screen = Screen.Relations },
                                onOpenGlossary = { screen = Screen.Glossary },
                                onOpenTraining = { screen = Screen.Exam }
                            )
                            Screen.Study -> MaterialStudyScreen(viewModel, onSource = { source = it })
                            Screen.Cards -> FlashcardScreen(viewModel, onlyErrors = false, onSource = { source = it })
                            Screen.Quiz -> QuizScreen(viewModel, onSource = { source = it })
                            Screen.Errors -> FlashcardScreen(viewModel, onlyErrors = true, onSource = { source = it })
                            Screen.Relations -> RelationsScreen(viewModel, onSource = { source = it })
                            Screen.Glossary -> GlossaryScreen(viewModel, onSource = { source = it })
                            Screen.Exam -> ExamPracticeScreen(viewModel, onSource = { source = it })
                            Screen.Prova -> ExamModeScreen(viewModel, onSource = { source = it })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeScreen(
    viewModel: StudyViewModel,
    onStartStudy: () -> Unit,
    onStartCards: () -> Unit,
    onStartQuiz: () -> Unit,
    onStartExam: () -> Unit,
    onOpenErrors: () -> Unit,
    onOpenRelations: () -> Unit,
    onOpenGlossary: () -> Unit,
    onOpenTraining: () -> Unit
) {
    val content = viewModel.content
    val progress = viewModel.progress
    val mastered = progress.masteredCardIds.size
    val total = content.flashcards.size.coerceAtLeast(1)
    val masteryPercent = ((mastered * 100f) / total).roundToInt()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Metodologia Científica", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Estude o conteúdo, pratique por cards e simule a prova discursiva.", style = MaterialTheme.typography.bodyMedium)
        }
        item {
            Panel {
                Text("Modo Prova", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Treino direto para acertar 100% nas rodadas e revisar só o que ficou fraco.")
                Spacer(Modifier.height(12.dp))
                Button(onClick = onStartExam, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Modo Prova")
                }
            }
        }
        item {
            Panel {
                Text("Ações rápidas", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Button(onClick = onStartStudy, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.Psychology, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Estudar conteúdo")
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = onStartCards, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.MenuBook, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Cards")
                    }
                    OutlinedButton(onClick = onStartQuiz, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.Quiz, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Quiz")
                    }
                }
            }
        }
        item {
            Panel {
                Text("Progresso", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { mastered / total.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    CenteredMetric("Domínio", "$masteryPercent%", Modifier.weight(1f))
                    CenteredMetric("Erros", progress.errorCardIds.size.toString(), Modifier.weight(1f))
                    CenteredMetric("Cards", total.toString(), Modifier.weight(1f))
                }
            }
        }
        item {
            Panel {
                Text("Mais recursos", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Acesse revisão, termos, relações e treino discursivo quando precisar aprofundar.")
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = onOpenTraining, modifier = Modifier.weight(1f)) { Text("Treino") }
                    OutlinedButton(onClick = onOpenGlossary, modifier = Modifier.weight(1f)) { Text("Termos") }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = onOpenRelations, modifier = Modifier.weight(1f)) { Text("Relações") }
                    OutlinedButton(onClick = onOpenErrors, modifier = Modifier.weight(1f)) { Text("Erros") }
                }
            }
        }
        item {
            OutlinedButton(onClick = viewModel::resetProgress, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Refresh, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Reiniciar progresso local")
            }
        }
    }
}

@Composable
fun FlashcardScreen(viewModel: StudyViewModel, onlyErrors: Boolean, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember(onlyErrors) { mutableStateOf<String?>(null) }
    var selectedPdf by remember(onlyErrors) { mutableStateOf<String?>(null) }
    val cards = remember(
        onlyErrors,
        selectedTopicId,
        selectedPdf,
        viewModel.progress.errorCardIds,
        viewModel.progress.masteredCardIds
    ) {
        val baseCards = if (onlyErrors) {
            viewModel.content.flashcards.filter { it.id in viewModel.progress.errorCardIds }
        } else {
            viewModel.content.flashcards
        }
        baseCards.filter { card ->
            (selectedTopicId == null || card.topicId == selectedTopicId) &&
                (selectedPdf == null || card.source.pdf == selectedPdf)
        }.shuffled()
    }
    var index by remember(cards) { mutableIntStateOf(0) }
    var confidence by remember(cards, index) { mutableStateOf<Confidence?>(null) }
    var revealed by remember(cards, index) { mutableStateOf(false) }
    val card = cards.getOrNull(index.coerceAtMost((cards.size - 1).coerceAtLeast(0)))

    if (card == null) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text(if (onlyErrors) "Revisão de erros" else "Flashcards", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
            item {
                StudyFilterPanel(
                    content = viewModel.content,
                    selectedTopicId = selectedTopicId,
                    onTopicSelected = { selectedTopicId = it },
                    selectedPdf = selectedPdf,
                    onPdfSelected = { selectedPdf = it }
                )
            }
            item {
                EmptyStatePanel(
                    title = if (onlyErrors) "Sem erros pendentes" else "Sem cards disponíveis",
                    message = if (onlyErrors) "Quando você errar ou marcar baixa confiança, o card aparece aqui." else "Não há cards para o recorte escolhido."
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(if (onlyErrors) "Revisão de erros" else "Flashcards", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("${index + 1} de ${cards.size} - ${card.type}", style = MaterialTheme.typography.bodyMedium)
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        item {
            Panel {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(card.type, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                    Text("${index + 1}/${cards.size}", style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { (index + 1) / cards.size.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                )
                Spacer(Modifier.height(16.dp))
                Text(if (revealed) "Resposta" else "Pergunta", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                Text(
                    if (revealed) card.back else card.front,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(14.dp))
                SourceButton(card.source, onSource)
                Spacer(Modifier.height(14.dp))
                if (!revealed) {
                    Text("Antes de revelar, marque sua confiança:", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    ConfidencePicker(confidence = confidence, onSelected = { confidence = it })
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = { revealed = true }, enabled = confidence != null, modifier = Modifier.fillMaxWidth()) {
                        Text("Revelar resposta")
                    }
                } else {
                    Text("Como foi sua recuperação?", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = {
                                viewModel.recordCard(card, confidence ?: Confidence.None, false)
                                index = ((index + 1) % cards.size.coerceAtLeast(1))
                                revealed = false
                                confidence = null
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Errei")
                        }
                        Button(
                            onClick = {
                                viewModel.recordCard(card, confidence ?: Confidence.None, true)
                                index = ((index + 1) % cards.size.coerceAtLeast(1))
                                revealed = false
                                confidence = null
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Acertei")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfidencePicker(confidence: Confidence?, onSelected: (Confidence) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Confidence.entries.forEach { item ->
            FilterChip(
                selected = confidence == item,
                onClick = { onSelected(item) },
                label = { Text(item.label) },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun MaterialStudyScreen(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    val guides = viewModel.content.studyGuides
    var selectedPdf by remember { mutableStateOf(guides.firstOrNull()?.pdf) }
    val guide = guides.firstOrNull { it.pdf == selectedPdf } ?: guides.firstOrNull()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Estudo", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Aprenda o conteúdo antes de praticar. Cada guia organiza o que cai, como responder e o que evitar.")
        }
        item {
            Panel {
                Text("Material", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Escolha o bloco de estudo.", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                guides.forEach { item ->
                    FilterChip(
                        selected = item.pdf == selectedPdf,
                        onClick = { selectedPdf = item.pdf },
                        label = { Text(item.title) },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
        if (guide == null) {
            item {
                EmptyStatePanel(
                    title = "Sem guias de estudo",
                    message = "Inclua um guia para cada PDF em study_content.json."
                )
            }
            return@LazyColumn
        }
        item {
            Panel {
                Text("Resumo do assunto", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(guide.title, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                Text(guide.purpose)
                Spacer(Modifier.height(10.dp))
                SourceButton(guide.source, onSource)
            }
        }
        item { ConceptChips(title = "O que preciso dominar", items = guide.visualTree) }
        item { StepList(title = "Caminho de resposta", items = guide.flow) }
        item { ComparisonBlock(title = "Comparações principais", items = guide.diagram) }
        item { StudySection(title = "Resposta-modelo", items = guide.metacognition) }
        item { ChecklistBlock(title = "Checklist de revisão", items = guide.strategies) }
    }
}

@Composable
fun StudySection(title: String, items: List<String>) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        items.forEach { item ->
            Text(item)
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun StepList(title: String, items: List<String>) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        items.forEachIndexed { index, item ->
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("${index + 1}.", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Text(item, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun ConceptChips(title: String, items: List<String>) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        items.forEach { item ->
            Surface(color = Color(0xFFE8F1EF), modifier = Modifier.fillMaxWidth()) {
                Text(item, modifier = Modifier.padding(10.dp), fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun ComparisonBlock(title: String, items: List<String>) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        items.forEach { item ->
            val parts = item.split(":", limit = 2)
            Text(parts.first(), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
            if (parts.size > 1) {
                Text(parts[1].trim())
            }
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
fun ChecklistBlock(title: String, items: List<String>) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        items.forEach { item ->
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("OK", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Text(item, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun QuizScreen(
    viewModel: StudyViewModel,
    onSource: (SourceReference) -> Unit
) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    val quizzes = remember(selectedTopicId, selectedPdf) {
        viewModel.content.quizzes.filter { quiz ->
            (selectedTopicId == null || quiz.topicId == selectedTopicId) &&
                (selectedPdf == null || quiz.source.pdf == selectedPdf)
        }.shuffled()
    }
    var index by remember(selectedTopicId, selectedPdf) { mutableIntStateOf(0) }
    var selected by remember(index, selectedTopicId, selectedPdf) { mutableStateOf<DisplayedOption?>(null) }
    var answered by remember(index, selectedTopicId, selectedPdf) { mutableStateOf(false) }
    var cardOffsetX by remember(index, selectedTopicId, selectedPdf) { mutableStateOf(0f) }
    val question = quizzes.getOrNull(index.coerceAtMost((quizzes.size - 1).coerceAtLeast(0)))
    val displayedOptions = remember(question?.id) { question?.displayedOptions().orEmpty() }
    fun nextQuestion() {
        index = (index + 1) % quizzes.size
        selected = null
        answered = false
        cardOffsetX = 0f
    }
    val cardDragState = rememberDraggableState { delta ->
        if (answered) {
            cardOffsetX = (cardOffsetX + delta).coerceIn(-220f, 0f)
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Quiz", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(if (question == null) "Sem questões neste recorte" else "${index + 1} de ${quizzes.size}")
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        if (question == null) {
            item {
                EmptyStatePanel(
                    title = "Sem questões disponíveis",
                    message = "Escolha outro assunto ou PDF para continuar praticando."
                )
            }
            return@LazyColumn
        }
        item {
            Panel(
                modifier = Modifier
                    .offset { IntOffset(cardOffsetX.roundToInt(), 0) }
                    .draggable(
                        enabled = answered,
                        orientation = Orientation.Horizontal,
                        state = cardDragState,
                        onDragStopped = {
                            if (cardOffsetX <= -130f) {
                                nextQuestion()
                            } else {
                                cardOffsetX = 0f
                            }
                        }
                    )
            ) {
                Text(question.question, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                SourceButton(question.source, onSource)
                Spacer(Modifier.height(12.dp))
                displayedOptions.forEach { option ->
                    val isSelected = selected?.originalIndex == option.originalIndex
                    val color = when {
                        !answered -> MaterialTheme.colorScheme.surface
                        option.isCorrect -> Color(0xFFE2F4EA)
                        isSelected -> Color(0xFFF8DCDC)
                        else -> MaterialTheme.colorScheme.surface
                    }
                    OutlinedButton(
                        onClick = {
                            selected = option
                            answered = true
                            viewModel.recordQuiz(question, option.isCorrect)
                        },
                        enabled = !answered,
                        colors = ButtonDefaults.outlinedButtonColors(containerColor = color),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(option.text, modifier = Modifier.fillMaxWidth())
                    }
                    Spacer(Modifier.height(8.dp))
                }
                if (answered) {
                    val correct = selected?.isCorrect == true
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (correct) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = if (correct) Color(0xFF1F7A43) else Color(0xFFB3261E)
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(if (correct) "Acerto consolidado" else "Erro bom: agora ele entra no radar", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(12.dp))
                    QuizExplanationBlock(
                        title = "Gabarito",
                        options = displayedOptions,
                        selected = selected,
                        showAll = true
                    )
                    Spacer(Modifier.height(12.dp))
                    SwipeNextControl(
                        onSwiped = { nextQuestion() }
                    )
                }
            }
        }
    }
}

@Composable
fun QuizExplanationBlock(
    title: String,
    options: List<DisplayedOption>,
    selected: DisplayedOption?,
    showAll: Boolean
) {
    var expanded by remember(options, selected, showAll) { mutableStateOf(false) }
    val correctOption = options.firstOrNull { it.isCorrect }
    val collapsedOptions = listOfNotNull(selected, correctOption)
        .distinctBy { it.originalIndex }
    val visibleOptions = if (showAll && expanded) {
        options
    } else {
        collapsedOptions
    }
    val canExpand = showAll && options.size > collapsedOptions.size
    if (canExpand) {
        Row(
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            IconButton(onClick = { expanded = !expanded }) {
                Icon(
                    Icons.Outlined.Source,
                    contentDescription = if (expanded) "Ocultar alternativas" else "Ver alternativas"
                )
            }
        }
    }
    visibleOptions.forEach { option ->
        val label = when {
            option.isCorrect -> "Correta"
            selected?.originalIndex == option.originalIndex -> "Sua escolha"
            else -> "Alternativa"
        }
        Text("$label: ${option.text}", fontWeight = FontWeight.SemiBold)
        Text(option.explanation)
        Spacer(Modifier.height(8.dp))
    }
    if (canExpand && !expanded) {
        Text("Toque no ícone para ver as outras alternativas.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun SwipeNextControl(onSwiped: () -> Unit) {
    var offsetX by remember { mutableStateOf(0f) }
    val dragState = rememberDraggableState { delta ->
        offsetX = (offsetX + delta).coerceIn(-180f, 0f)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(Color(0xFFE8F1EF))
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text("Arraste o botão para a esquerda")
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .offset { IntOffset(offsetX.roundToInt(), 0) }
                .width(132.dp)
                .height(44.dp)
                .background(MaterialTheme.colorScheme.primary)
                .draggable(
                    orientation = Orientation.Horizontal,
                    state = dragState,
                    onDragStopped = {
                        if (offsetX <= -110f) {
                            onSwiped()
                        }
                        offsetX = 0f
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Text("Próxima", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
    Spacer(Modifier.height(8.dp))
    OutlinedButton(onClick = onSwiped, modifier = Modifier.fillMaxWidth()) {
        Text("Próxima")
    }
}

@Composable
fun QuizScreenOld(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    val quizzes = viewModel.content.quizzes.filter { quiz ->
        (selectedTopicId == null || quiz.topicId == selectedTopicId) &&
            (selectedPdf == null || quiz.source.pdf == selectedPdf)
    }
    var index by remember(selectedTopicId, selectedPdf) { mutableIntStateOf(0) }
    var selected by remember(index, selectedTopicId, selectedPdf) { mutableStateOf<Int?>(null) }
    var answered by remember(index, selectedTopicId, selectedPdf) { mutableStateOf(false) }
    val question = quizzes.getOrNull(index.coerceAtMost((quizzes.size - 1).coerceAtLeast(0)))

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Quiz", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(if (question == null) "Sem questões neste recorte" else "${index + 1} de ${quizzes.size}")
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        if (question == null) {
            item {
                EmptyStatePanel(
                    title = "Sem questões disponíveis",
                    message = "Escolha outro assunto ou PDF para continuar praticando."
                )
            }
            return@LazyColumn
        }
        item {
            Panel {
                Text(question.question, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                question.options.forEachIndexed { optionIndex, option ->
                    val isCorrect = optionIndex == question.correctOptionIndex
                    val color = when {
                        !answered -> MaterialTheme.colorScheme.surface
                        isCorrect -> Color(0xFFE2F4EA)
                        selected == optionIndex -> Color(0xFFF8DCDC)
                        else -> MaterialTheme.colorScheme.surface
                    }
                    OutlinedButton(
                        onClick = {
                            selected = optionIndex
                            answered = true
                            viewModel.recordQuiz(question, optionIndex == question.correctOptionIndex)
                        },
                        enabled = !answered,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(color)
                    ) {
                        Text(option, modifier = Modifier.fillMaxWidth())
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
        if (answered) {
            item {
                Panel {
                    val correct = selected == question.correctOptionIndex
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (correct) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = if (correct) Color(0xFF1F7A43) else Color(0xFFB3261E)
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(if (correct) "Acerto consolidado" else "Erro bom: agora ele entra no radar", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(question.explanation)
                    Spacer(Modifier.height(12.dp))
                    SourceButton(question.source, onSource)
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            index = (index + 1) % quizzes.size
                            selected = null
                            answered = false
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Próxima questão")
                    }
                }
            }
        }
    }
}

@Composable
fun RelationsScreen(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    val relations = viewModel.content.relations.filter { relation ->
        (selectedTopicId == null || relation.topicId == selectedTopicId) &&
            (selectedPdf == null || relation.source.pdf == selectedPdf)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Relações conceituais", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Use esta tela para sair da memorização solta e ligar ideias.", style = MaterialTheme.typography.bodyMedium)
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        if (relations.isEmpty()) {
            item {
                EmptyStatePanel(
                    title = "Sem relações neste recorte",
                    message = "Escolha outro assunto ou PDF para encontrar conexões conceituais."
                )
            }
        }
        items(relations) { relation ->
            Panel {
                Text("${relation.from} -> ${relation.to}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(relation.description)
                Spacer(Modifier.height(10.dp))
                SourceButton(relation.source, onSource)
            }
        }
    }
}

@Composable
fun GlossaryScreen(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    val terms = viewModel.content.glossary
        .filter { term ->
            (selectedTopicId == null || term.topicId == selectedTopicId) &&
                (selectedPdf == null || term.source.pdf == selectedPdf)
        }
        .sortedBy { it.term }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Termos e conceitos", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Consulte significados rápidos antes de avançar para cards e quizzes.")
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        if (terms.isEmpty()) {
            item {
                EmptyStatePanel(
                    title = "Sem termos neste recorte",
                    message = "Limpe os filtros ou escolha outro assunto para consultar conceitos."
                )
            }
        }
        items(terms) { term ->
            Panel {
                Text(term.term, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(term.definition)
                Spacer(Modifier.height(10.dp))
                SourceButton(term.source, onSource)
            }
        }
    }
}

@Composable
fun ExamModeScreen(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    var roundMode by remember { mutableStateOf<ExamRoundMode?>(null) }
    val cards = viewModel.content.flashcards.filter { card ->
        (selectedTopicId == null || card.topicId == selectedTopicId) &&
            (selectedPdf == null || card.source.pdf == selectedPdf)
    }
    val quizzes = viewModel.content.quizzes.filter { quiz ->
        (selectedTopicId == null || quiz.topicId == selectedTopicId) &&
            (selectedPdf == null || quiz.source.pdf == selectedPdf)
    }

    when (roundMode) {
        ExamRoundMode.Cards -> ExamCardRoundScreen(
            viewModel = viewModel,
            cards = cards,
            onBack = { roundMode = null },
            onSource = onSource
        )
        ExamRoundMode.Quiz -> ExamQuizRoundScreen(
            viewModel = viewModel,
            quizzes = quizzes,
            onBack = { roundMode = null },
            onSource = onSource
        )
        null -> LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Modo Prova", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Teste seu domínio em uma rodada de cards ou quiz.")
            }
            item {
                StudyFilterPanel(
                    content = viewModel.content,
                    selectedTopicId = selectedTopicId,
                    onTopicSelected = { selectedTopicId = it },
                    selectedPdf = selectedPdf,
                    onPdfSelected = { selectedPdf = it }
                )
            }
            item {
                Panel {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        CenteredMetric("Cards", cards.size.toString(), Modifier.weight(1f))
                        CenteredMetric("Quiz", quizzes.size.toString(), Modifier.weight(1f))
                        CenteredMetric("Meta", "100%", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { roundMode = ExamRoundMode.Cards },
                        enabled = cards.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Outlined.MenuBook, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Rodada de Cards")
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { roundMode = ExamRoundMode.Quiz },
                        enabled = quizzes.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Outlined.Quiz, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Rodada de Quiz")
                    }
                }
            }
        }
    }
}

@Composable
fun ExamCardRoundScreen(
    viewModel: StudyViewModel,
    cards: List<Flashcard>,
    onBack: () -> Unit,
    onSource: (SourceReference) -> Unit
) {
    var roundSeed by remember(cards) { mutableIntStateOf(0) }
    val roundCards = remember(cards, roundSeed) { cards.shuffled() }
    var index by remember(roundCards) { mutableIntStateOf(0) }
    var revealed by remember(roundCards, index) { mutableStateOf(false) }
    var offsetX by remember(roundCards, index) { mutableStateOf(0f) }
    var correctCount by remember(roundCards) { mutableIntStateOf(0) }
    var missedCards by remember(roundCards) { mutableStateOf<List<Flashcard>>(emptyList()) }
    var finished by remember(roundCards) { mutableStateOf(roundCards.isEmpty()) }
    val total = roundCards.size
    val current = roundCards.getOrNull(index)

    fun finishCard(known: Boolean) {
        val card = current ?: return
        viewModel.recordCard(card, Confidence.Explain, known)
        if (known) {
            correctCount += 1
        } else {
            missedCards = missedCards + card
        }
        if (index >= total - 1) {
            finished = true
        } else {
            index += 1
            revealed = false
            offsetX = 0f
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            OutlinedButton(onClick = onBack) {
                Icon(Icons.Outlined.ArrowBack, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Voltar")
            }
        }
        if (finished) {
            item {
                RoundSummaryPanel(
                    title = "Resultado da rodada de cards",
                    correct = correctCount,
                    total = total,
                    onRetry = {
                        index = 0
                        revealed = false
                        offsetX = 0f
                        correctCount = 0
                        missedCards = emptyList()
                        roundSeed += 1
                        finished = cards.isEmpty()
                    }
                )
            }
            if (missedCards.isNotEmpty()) {
                item { Text("Revisao dos cards errados", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                items(missedCards) { card ->
                    Panel {
                        Text(card.front, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text(card.back)
                        Spacer(Modifier.height(10.dp))
                        SourceButton(card.source, onSource)
                    }
                }
            }
        } else if (current != null) {
            item {
                Text("Rodada de Cards", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("${index + 1} de $total | toque para revelar, arraste para marcar.")
                LinearProgressIndicator(
                    progress = { (index + 1) / total.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                )
            }
            item {
                val cardColor = when {
                    offsetX < -20f -> Color(0xFFE1F4E8)
                    offsetX > 20f -> Color(0xFFF8DDDD)
                    else -> MaterialTheme.colorScheme.surface
                }
                val dragState = rememberDraggableState { delta ->
                    offsetX = (offsetX + delta).coerceIn(-260f, 260f)
                }
                Card(
                    colors = CardDefaults.cardColors(containerColor = cardColor),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .offset { IntOffset(offsetX.roundToInt(), 0) }
                        .draggable(
                            state = dragState,
                            orientation = Orientation.Horizontal,
                            enabled = revealed,
                            onDragStopped = {
                                when {
                                    offsetX <= -120f -> finishCard(true)
                                    offsetX >= 120f -> finishCard(false)
                                    else -> offsetX = 0f
                                }
                            }
                        )
                        .clickable { revealed = !revealed }
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(if (revealed) "Resposta" else "Pergunta", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                        Text(
                            if (revealed) current.back else current.front,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            when {
                                !revealed -> "Toque no card para revelar."
                                offsetX < -20f -> "Solte a esquerda: sei"
                                offsetX > 20f -> "Solte à direita: não sei"
                                else -> "Arraste para a esquerda se souber ou para a direita se não souber."
                            }
                        )
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = { finishCard(true) },
                        enabled = revealed,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D50)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Sei")
                    }
                    Button(
                        onClick = { finishCard(false) },
                        enabled = revealed,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB84A4A)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Não sei")
                    }
                }
            }
            item { SourceButton(current.source, onSource) }
        }
    }
}

@Composable
fun ExamQuizRoundScreen(
    viewModel: StudyViewModel,
    quizzes: List<QuizQuestion>,
    onBack: () -> Unit,
    onSource: (SourceReference) -> Unit
) {
    var roundSeed by remember(quizzes) { mutableIntStateOf(0) }
    val roundQuizzes = remember(quizzes, roundSeed) { quizzes.shuffled() }
    var index by remember(roundQuizzes) { mutableIntStateOf(0) }
    var selected by remember(roundQuizzes, index) { mutableStateOf<DisplayedOption?>(null) }
    var correctCount by remember(roundQuizzes) { mutableIntStateOf(0) }
    var missedQuestions by remember(roundQuizzes) { mutableStateOf<List<QuizQuestion>>(emptyList()) }
    var finished by remember(roundQuizzes) { mutableStateOf(roundQuizzes.isEmpty()) }
    val total = roundQuizzes.size
    val current = roundQuizzes.getOrNull(index)
    val displayedOptions = remember(current?.id) { current?.displayedOptions().orEmpty() }
    val answered = selected != null

    fun choose(option: DisplayedOption) {
        if (answered) return
        val quiz = current ?: return
        val correct = option.isCorrect
        selected = option
        viewModel.recordQuiz(quiz, correct)
        if (correct) {
            correctCount += 1
        } else {
            missedQuestions = missedQuestions + quiz
        }
    }

    fun nextQuestion() {
        if (index >= total - 1) {
            finished = true
        } else {
            index += 1
            selected = null
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            OutlinedButton(onClick = onBack) {
                Icon(Icons.Outlined.ArrowBack, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Voltar")
            }
        }
        if (finished) {
            item {
                RoundSummaryPanel(
                    title = "Resultado da rodada de quiz",
                    correct = correctCount,
                    total = total,
                    onRetry = {
                        index = 0
                        selected = null
                        correctCount = 0
                        missedQuestions = emptyList()
                        roundSeed += 1
                        finished = quizzes.isEmpty()
                    }
                )
            }
            if (missedQuestions.isNotEmpty()) {
                item { Text("Revisao das questoes erradas", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                items(missedQuestions) { quiz ->
                    Panel {
                        Text(quiz.question, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text("Resposta: ${quiz.options[quiz.correctOptionIndex]}", fontWeight = FontWeight.SemiBold)
                        Text(quiz.optionExplanations.getOrElse(quiz.correctOptionIndex) { quiz.explanation })
                        Spacer(Modifier.height(10.dp))
                        SourceButton(quiz.source, onSource)
                    }
                }
            }
        } else if (current != null) {
            item {
                Text("Rodada de Quiz", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("${index + 1} de $total | feedback imediato com explicação.")
                LinearProgressIndicator(
                    progress = { (index + 1) / total.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                )
            }
            item {
                Panel {
                    Text(current.question, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    displayedOptions.forEach { option ->
                        val isSelected = selected?.originalIndex == option.originalIndex
                        val buttonColors = when {
                            answered && option.isCorrect -> ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFFE1F4E8))
                            answered && isSelected && !option.isCorrect -> ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFFF8DDDD))
                            else -> ButtonDefaults.outlinedButtonColors()
                        }
                        OutlinedButton(
                            onClick = { choose(option) },
                            enabled = !answered,
                            colors = buttonColors,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(option.text)
                        }
                        Spacer(Modifier.height(6.dp))
                    }
                    if (answered) {
                        QuizExplanationBlock(
                            title = "Gabarito",
                            options = displayedOptions,
                            selected = selected,
                            showAll = true
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(onClick = ::nextQuestion, modifier = Modifier.fillMaxWidth()) {
                            Text(if (index >= total - 1) "Ver resultado" else "Próxima")
                        }
                    }
                }
            }
            item { SourceButton(current.source, onSource) }
        }
    }
}

@Composable
fun RoundSummaryPanel(title: String, correct: Int, total: Int, onRetry: () -> Unit) {
    val percent = if (total == 0) 0 else (correct * 100) / total
    Panel {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("$correct de $total acertos ($percent%)", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(if (percent == 100) "Nota máxima: você acertou tudo." else "Ainda não deu nota máxima. Revise os erros e tente outra rodada.")
        Spacer(Modifier.height(12.dp))
        Button(onClick = onRetry, enabled = total > 0, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Refresh, contentDescription = null)
            Spacer(Modifier.size(8.dp))
            Text("Refazer rodada")
        }
    }
}

@Composable
fun ExamPracticeScreen(viewModel: StudyViewModel, onSource: (SourceReference) -> Unit) {
    var selectedTopicId by remember { mutableStateOf<String?>(null) }
    var selectedPdf by remember { mutableStateOf<String?>(null) }
    val questions = viewModel.content.examPractice.filter { question ->
        (selectedTopicId == null || question.topicId == selectedTopicId) &&
            (selectedPdf == null || question.source.pdf == selectedPdf)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Treino discursivo", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Pratique combinações de conceitos, aprofundamento e respostas articuladas.")
        }
        item {
            Text("Modelos de prova", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
        items(viewModel.content.examModels) { model ->
            Panel {
                Text(model.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(model.focus)
                Text(model.duration, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(10.dp))
                model.questions.forEachIndexed { index, question ->
                    Text("${index + 1}. $question")
                    Spacer(Modifier.height(6.dp))
                }
                Spacer(Modifier.height(8.dp))
                Text("Como corrigir", fontWeight = FontWeight.SemiBold)
                model.rubric.forEach { item ->
                    Text("- $item")
                }
                Spacer(Modifier.height(10.dp))
                SourceButton(model.source, onSource)
            }
        }
        item {
            Text("Treinos por competência", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
        item {
            Panel {
                Text("Como responder", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Comece definindo os termos, compare ideias, explique relações e feche com uma frase conclusiva.")
                Spacer(Modifier.height(8.dp))
                Text("A prova passada orienta o padrão: comparar, explicar, relacionar e justificar com clareza.")
            }
        }
        item {
            StudyFilterPanel(
                content = viewModel.content,
                selectedTopicId = selectedTopicId,
                onTopicSelected = { selectedTopicId = it },
                selectedPdf = selectedPdf,
                onPdfSelected = { selectedPdf = it }
            )
        }
        if (questions.isEmpty()) {
            item {
                EmptyStatePanel(
                    title = "Sem treinos neste recorte",
                    message = "Limpe os filtros para ver exercícios discursivos mais amplos."
                )
            }
        }
        items(questions) { question ->
            Panel {
                Text(question.weight, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                Text(question.prompt, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Text("Estratégia de resposta", fontWeight = FontWeight.SemiBold)
                Text(question.approach)
                Spacer(Modifier.height(10.dp))
                Text("Checklist", fontWeight = FontWeight.SemiBold)
                question.checklist.forEach { item ->
                    Text("- $item")
                }
                Spacer(Modifier.height(10.dp))
                SourceButton(question.source, onSource)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyFilterPanel(
    content: StudyContent,
    selectedTopicId: String?,
    onTopicSelected: (String?) -> Unit,
    selectedPdf: String?,
    onPdfSelected: (String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedTopic = content.topics.firstOrNull { it.id == selectedTopicId }?.name ?: "Todos os assuntos"
    val selectedDocument = selectedPdf ?: "Todos os PDFs"

    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Recorte de estudo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("$selectedTopic | $selectedDocument", style = MaterialTheme.typography.bodySmall)
            }
            OutlinedButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "Recolher" else "Filtros")
            }
        }
        if (!expanded) {
            return@Panel
        }
        Spacer(Modifier.height(10.dp))
        Text("Assunto", fontWeight = FontWeight.SemiBold)
        FilterChip(
            selected = selectedTopicId == null,
            onClick = { onTopicSelected(null) },
            label = { Text("Todos os assuntos") },
            modifier = Modifier.fillMaxWidth()
        )
        content.topics.forEach { topic ->
            FilterChip(
                selected = selectedTopicId == topic.id,
                onClick = { onTopicSelected(topic.id) },
                label = { Text(topic.name) },
                modifier = Modifier.fillMaxWidth()
            )
        }
        Spacer(Modifier.height(10.dp))
        Text("Documento", fontWeight = FontWeight.SemiBold)
        FilterChip(
            selected = selectedPdf == null,
            onClick = { onPdfSelected(null) },
            label = { Text("Todos os PDFs") },
            modifier = Modifier.fillMaxWidth()
        )
        content.availablePdfs().forEach { pdf ->
            FilterChip(
                selected = selectedPdf == pdf,
                onClick = { onPdfSelected(pdf) },
                label = { Text(pdf) },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SourceScreen(source: SourceReference, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fonte do PDF", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Panel {
                Text(source.pdf, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Página ${source.page}")
                Spacer(Modifier.height(12.dp))
                Text(source.excerpt)
            }
        }
    }
}

@Composable
fun MissionRow(label: String, value: Int, target: Int) {
    val progress = (value.toFloat() / target).coerceIn(0f, 1f)
    Spacer(Modifier.height(10.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
        Text("${value.coerceAtMost(target)}/$target")
    }
    LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
}

@Composable
fun Metric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun CenteredMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}

@Composable
fun SourceButton(source: SourceReference, onSource: (SourceReference) -> Unit) {
    OutlinedButton(onClick = { onSource(source) }, modifier = Modifier.fillMaxWidth()) {
        Icon(Icons.Outlined.Source, contentDescription = null)
        Spacer(Modifier.size(8.dp))
        Text("${source.pdf}, p. ${source.page}", maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun EmptyState(title: String, message: String) {
    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color(0xFF1F6F68))
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(message)
        }
    }
}

@Composable
fun EmptyStatePanel(title: String, message: String) {
    Panel {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(message)
    }
}

fun StudyContent.availablePdfs(): List<String> {
    return (flashcards.map { it.source.pdf } +
        quizzes.map { it.source.pdf } +
        relations.map { it.source.pdf } +
        glossary.map { it.source.pdf } +
        examPractice.map { it.source.pdf } +
        examModels.map { it.source.pdf } +
        studyGuides.map { it.pdf })
        .distinct()
        .sorted()
}

fun JSONObject.toSource(): SourceReference {
    return SourceReference(
        pdf = getString("pdf"),
        page = getInt("page"),
        excerpt = getString("excerpt")
    )
}

fun JSONArray.mapStrings(): List<String> {
    return (0 until length()).map { getString(it) }
}

fun <T> JSONArray.mapObjects(block: JSONObject.() -> T): List<T> {
    return (0 until length()).map { getJSONObject(it).block() }
}
