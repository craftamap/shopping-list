CREATE TABLE lists (
    id      text    PRIMARY KEY NOT NULL,
    status  text                NOT NULL DEFAULT "todo",
    date    text                NOT NULL
);

CREATE TABLE items (
    id      text    PRIMARY KEY NOT NULL,
    text    text                NOT NULL,
    checked integer             NOT NULL,
    list    text                NOT NULL,
    parent  text,
    sort    real                NOT NULL,
    sortFractions   blob        NOT NULL,
    FOREIGN KEY (list) REFERENCES lists (id),
    FOREIGN KEY (parent) REFERENCES items (id)
);

CREATE TABLE users (
    id              integer PRIMARY KEY NOT NULL,
    username        text                NOT NULL UNIQUE,
    passwordHash    text                NOT NULL
);

CREATE TABLE sessions (
    id          text    PRIMARY KEY NOT NULL,
    data        text                NOT NULL, 
    expiresAt   text                NOT NULL
);
