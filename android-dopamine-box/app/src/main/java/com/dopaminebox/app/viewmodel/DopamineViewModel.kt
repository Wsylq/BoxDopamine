package com.dopaminebox.app.viewmodel

import android.app.Application
import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dopaminebox.app.model.FeedEvent
import com.dopaminebox.app.model.MiniGameType
import com.dopaminebox.app.model.PlayerState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.max

private val Context.dopamineStore by preferencesDataStore(name = "dopamine_box_store")

class DopamineViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext

    private val coinsKey = longPreferencesKey("coins")
    private val streakKey = intPreferencesKey("streak_days")
    private val lastOpenKey = stringPreferencesKey("last_open_date")

    private val _playerState = MutableStateFlow(PlayerState())
    val playerState: StateFlow<PlayerState> = _playerState.asStateFlow()

    private val _feed = MutableStateFlow(seedFeed())
    val feed: StateFlow<List<FeedEvent>> = _feed.asStateFlow()

    private val _streakWarning = MutableStateFlow(false)
    val streakWarning: StateFlow<Boolean> = _streakWarning.asStateFlow()

    private val _showJackpotCelebration = MutableStateFlow(false)
    val showJackpotCelebration: StateFlow<Boolean> = _showJackpotCelebration.asStateFlow()

    init {
        viewModelScope.launch {
            hydrateFromDiskAndTrackOpen()
        }
    }

    fun accelerateFeed(swipesPerSecond: Float) {
        _playerState.value = _playerState.value.copy(
            scrollSpeedMultiplier = (1f + swipesPerSecond / 3.5f).coerceIn(1f, 3.8f),
        )
    }

    fun onWin(reward: Long) {
        val updatedCoins = _playerState.value.coins + reward
        _playerState.value = _playerState.value.copy(coins = updatedCoins, lastReward = reward)
        if (updatedCoins >= 10_000_000L) {
            _showJackpotCelebration.value = true
        }
        appendFeed(extraDepth = 1)
        persistCoinsAndStreak()
    }

    fun onLose(penalty: Long) {
        val nextCoins = max(0L, _playerState.value.coins - penalty)
        _playerState.value = _playerState.value.copy(coins = nextCoins, lastReward = -penalty)
        appendFeed(extraDepth = 3)
        persistCoinsAndStreak()
    }

    fun ensureFeedForIndex(targetIndex: Int) {
        if (targetIndex < 0) return
        val remainingAhead = _feed.value.lastIndex - targetIndex
        if (remainingAhead >= 10) return
        appendFeed(extraDepth = (10 - remainingAhead).coerceAtLeast(4))
    }

    fun consumeStreakWarning() {
        _streakWarning.value = false
    }

    fun consumeJackpotAndReset() {
        _showJackpotCelebration.value = false
        _playerState.value = _playerState.value.copy(coins = 1_000L, lastReward = 0L)
        persistCoinsAndStreak()
    }

    private fun appendFeed(extraDepth: Int) {
        val current = _feed.value
        val startId = (current.lastOrNull()?.id ?: 0L) + 1L
        val additions = List(extraDepth) { idx ->
            val game = MiniGameType.values()[(startId.toInt() + idx) % MiniGameType.values().size]
            FeedEvent(
                id = startId + idx,
                title = when (game) {
                    MiniGameType.COIN_FLIP -> "Coin Flip Rush"
                    MiniGameType.HIGHER_LOWER -> "Higher or Lower"
                    MiniGameType.PLINKO -> "Plinko Drop"
                    MiniGameType.FLAPPY_COINS -> "Flappy Coins"
                },
                subtitle = "Win to stay. Lose to swipe deeper.",
                gameType = game,
            )
        }
        _feed.value = current + additions
    }

    private suspend fun hydrateFromDiskAndTrackOpen() {
        val prefs = context.dopamineStore.data.first()
        val storedCoins = prefs[coinsKey] ?: 1_000L
        val storedStreak = prefs[streakKey] ?: 0
        val lastOpenRaw = prefs[lastOpenKey]
        val today = LocalDate.now()

        val (nextStreak, warning) = computeStreak(storedStreak, lastOpenRaw, today)
        _playerState.value = _playerState.value.copy(coins = storedCoins, streakDays = nextStreak)
        _streakWarning.value = warning

        context.dopamineStore.edit {
            it[lastOpenKey] = today.toString()
            it[streakKey] = nextStreak
            it[coinsKey] = storedCoins
        }
    }

    private fun computeStreak(storedStreak: Int, lastOpenRaw: String?, today: LocalDate): Pair<Int, Boolean> {
        if (lastOpenRaw == null) return 1 to false
        val lastOpen = runCatching { LocalDate.parse(lastOpenRaw) }.getOrNull() ?: return 1 to false
        val delta = ChronoUnit.DAYS.between(lastOpen, today)
        return when {
            delta <= 0L -> storedStreak.coerceAtLeast(1) to false
            delta == 1L -> (storedStreak + 1).coerceAtLeast(1) to false
            else -> 0 to true
        }
    }

    private fun persistCoinsAndStreak() {
        val state = _playerState.value
        viewModelScope.launch {
            context.dopamineStore.edit { prefs: MutablePreferences ->
                prefs[coinsKey] = state.coins
                prefs[streakKey] = state.streakDays
            }
        }
    }

    private fun seedFeed(): List<FeedEvent> = List(24) { i ->
        val game = MiniGameType.values()[i % MiniGameType.values().size]
        FeedEvent(
            id = i.toLong(),
            title = "Dopamine Round ${i + 1}",
            subtitle = "Chase the next hit",
            gameType = game,
        )
    }
}