// Module imports
import {
	spy,
	useFakeTimers,
} from 'sinon'
import { expect } from 'chai'
import { parse as parseIRCMessage } from 'irc-message'
import { v4 as uuid } from 'uuid'
import EventEmitter from 'events'
import faker from 'faker'





// Local imports
import CAPABILITIES from 'data/CAPABILITIES'
import Channel from 'structures/Channel'
import Connection from 'structures/Connection'
import User from 'structures/User'





// Local constants
const testChannelName = 'TestChannel'
const testMultiMonthSubLength = 3
const testOauthToken = 'oauth:1234567890'
const testUsername = 'Bob'
const ircSocket = class extends EventEmitter {
	end = () => {}
	write = () => {}
}
const wsSocket = class extends EventEmitter {
	send = () => {}
	terminate = () => {}
}





describe('subgift events', function() {
	const clock = useFakeTimers()
	const fdgtUser = new User({ username: 'fdgt' })

	let connection = null
	let socket = null

	beforeEach(() => {
		socket = new wsSocket
		connection = new Connection({
			fdgtUser,
			socket,
		})

		socket.emit('message', `NICK ${testUsername}`)
		socket.emit('message', `PASS ${testOauthToken}`)
		socket.emit('message', `CAP REQ ${CAPABILITIES.join(' ')}`)
		socket.emit('message', 'CAP END')
		socket.emit('message', `JOIN #${testChannelName}`)

		spy(connection)
		spy(socket)
	})

	afterEach(() => {
		connection.close()
		connection = null
		socket = null
	})

	it('should simulate a `subgift` event', () => {
		socket.emit('message', `PRIVMSG #${testChannelName} :subgift`)

		const rawMessage = connection.send.getCall(0)?.firstArg
		const {
			command,
			tags,
		} = parseIRCMessage(rawMessage)

		expect(tags.badges).to.include('sub-gifter/')
		expect(tags['msg-param-sub-plan-name']).to.equal('Tier\\s1')
		expect(tags['msg-param-sub-plan']).to.equal('1000')
		expect(command).to.equal('USERNOTICE')
	})

	it('should set the sender\'s username', () => {
		socket.emit('message', `PRIVMSG #${testChannelName} :subgift --username ${testUsername}`)

		const rawMessage = connection.send.getCall(0).firstArg
		const { tags } = parseIRCMessage(rawMessage)

		expect(tags['display-name']).to.equal(testUsername)
		expect(tags.login).to.equal(testUsername)
	})

	it('should set the recipient\'s username', () => {
		socket.emit('message', `PRIVMSG #${testChannelName} :subgift --username2 ${testUsername}`)

		const rawMessage = connection.send.getCall(0).firstArg
		const { tags } = parseIRCMessage(rawMessage)

		expect(tags['msg-param-recipient-display-name']).to.equal(testUsername)
		expect(tags['msg-param-recipient-user-name']).to.equal(testUsername)
	})

	it('should set the recipient\'s username', () => {
		socket.emit('message', `PRIVMSG #foobar :subgift --channel ${testChannelName}`)

		const rawMessage = connection.send.getCall(0).firstArg
		const { params: [channelName] } = parseIRCMessage(rawMessage)

		expect(channelName).to.equal(`#${testChannelName}`)
	})

	it('should handle multi-month gift subs', () => {
		socket.emit('message', `PRIVMSG #${testChannelName} :subgift --months ${testMultiMonthSubLength}`)

		const rawMessage = connection.send.getCall(0).firstArg
		const { tags } = parseIRCMessage(rawMessage)

		expect(tags['msg-params-gift-months']).to.equal(`${testMultiMonthSubLength}`)
	})
})
