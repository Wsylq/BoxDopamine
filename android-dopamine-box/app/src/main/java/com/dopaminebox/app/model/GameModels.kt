package com.dopaminebox.app.model

enum class MiniGameType {
    COIN_FLIP,
    HIGHER_LOWER,
    PLINKO,
    FLAPPY_COINS,
}

data class FeedEvent(
    val id: Long,
    val title: String,
    val subtitle: String,
    val gameType: MiniGameType,
)

data class PlayerState(
    val coins: Long = 1_000,
    val streakDays: Int = 1,
    val lastReward: Long = 0,
    val scrollSpeedMultiplier: Float = 1f,
)